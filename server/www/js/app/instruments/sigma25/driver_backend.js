/**
 * (c) 2015 Edouard Lafargue, ed@lafargue.name
 *
 * This file is part of Wizkers.
 *
 * Wizkers is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wizkers is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wizkers.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * Browser-side Parser for IMI Kromek USB Interface for the Sigma25.
 *
 * This Browser-side parser is used when running as a Chrome or Cordova app.
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */

define(function (require) {
    "use strict";

    var Backbone = require('backbone'),
        Serialport = require('serialport'),
        serialConnection = require('connections_serial');

    var parser = function (socket) {

        /////////////
        // Private methods
        /////////////

        var socket = socket;

        var self = this,
            port = null,
            port_close_requested = false,
            port_open_requested = true,
            isopen = false,
            streaming = false;

        var portSettings = function () {
            return {
                baudRate: 115200,
                dataBits: 8,
                parity: 'none',
                stopBits: 1,
                dtr: false,
                flowControl: false,
                parser: Serialport.parsers.readline('\n'),
            }
        };

        // Format can act on incoming data from the counter, and then
        // forwards the data to the app through a 'serialEvent' event.
        var format = function (data) {

            // We parse and return JSON
            try {
                if (data.length < 2)
                    return;
                data = data.replace('\n', '');

                var jsresp = {};
                var resp = data.split(':');
                if (resp[0] == 'C') {
                    var ch = resp[1].split(',').map(function( num ){ return parseInt( num, 10 ) });
                    jsresp.channels = ch;
                } else if (resp[0] == 'version') {
                    jsresp.version = resp[1];
                } else if (resp[0] == 'serial') {
                    jsresp.serial = resp[1];
                } else if (resp[0] == 'gain') {
                    jsresp.gain = parseInt(resp[1]);
                } else if (resp[0] == 'bias') {
                    jsresp.bias = parseInt(resp[1]);
                } else if (resp[0] == 'lld_channel') {
                    jsresp.lld_channel = parseInt(resp[1]);
                } else if (resp.length > 1) {
                    jsresp[resp[0]] = resp.slice(1);
                } else {
                    jsresp.raw = data;
                }
                self.trigger('data', jsresp);
            } catch (err) {
                console.log('Not able to parse data from device:\n' + data + '\n' + err);
            }
        };


        // Status returns an object that is concatenated with the
        // global server status
        var status = function (stat) {
            port_open_requested = false;
            console.log('Port status change', stat);
            if (stat.openerror) {
                // We could not open the port: warn through
                // a 'data' messages
                var resp = {
                    openerror: true
                };
                if (stat.reason != undefined)
                    resp.reason = stat.reason;
                if (stat.description != undefined)
                    resp.description = stat.description;
                self.trigger('data', resp);
                return;
            }

            isopen = stat.portopen;

            if (isopen) {
                // Should run any "onOpen" initialization routine here if
                // necessary.
            } else {
                // We remove the listener so that the serial port can be GC'ed
                if (port_close_requested) {
                    port.off('status', stat);
                    port_close_requested = false;
                }
            }
        };



        /////////////
        // Public methods
        /////////////

        this.openPort = function (insid) {
            port_open_requested = true;
            var ins = instrumentManager.getInstrument();
            port = new serialConnection(ins.get('port'), portSettings());
            port.on('data', format);
            port.on('status', status);

        };

        this.closePort = function (data) {
            // We need to remove all listeners otherwise the serial port
            // will never be GC'ed
            port.off('data', format);
            port_close_requested = true;
            port.close();
        }

        this.isOpen = function () {
            return isopen;
        }

        this.isOpenPending = function() {
            return port_open_requested;
        }

        this.getInstrumentId = function (arg) {};

        // Called when the app needs a unique identifier.
        // this is a standardized call across all drivers.
        //
        // Returns the Geiger counter GUID.
        this.sendUniqueID = function () {
            self.trigger('data', {
                uniqueID: '00000000 (n.a.)'
            });
        };

        this.isStreaming = function () {
            return streaming;
        };


        // period in seconds
        this.startLiveStream = function (period) {
            self.output('S');
            streaming = true;
        };

        this.stopLiveStream = function (args) {
            self.output('s');
            streaming = false;
        };

        // output should return a string, and is used to format
        // the data that is sent on the serial port, coming from the
        // HTML interface.
        this.output = function (data) {
                port.write(data + '\n');
        };

    }

    _.extend(parser.prototype, Backbone.Events);
    return parser;
});