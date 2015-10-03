/**
 * (c) 2015 Edouard Lafargue, ed@lafargue.name
 *
 * This file is part of Wizkers.
 *
 * Wizkers is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wizkers is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Wizkers.  If not, see <http://www.gnu.org/licenses/>.
 */

define(function (require) {
    "use strict";

    var Backbone = require('backbone'),
        abutils = require('app/lib/abutils'),
        btleConnection = require('connections_btle');


    var parser = function (socket) {

        var self = this,
            socket = socket,
            streaming = true,
            port = null,
            port_close_requested = false,
            port_open_requested = false,
            isopen = false,
            isInitialized = 0,
            lastUpdate = new Date().getTime();

        var HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
        var HEART_RATE_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

        // We need to write a "0" (string) to this characteristic to get the BlueOnyx
        // to start sending measurements, because it boots in Bootloader mode and remains there
        // until we tell it otherwise.
        var BLEONYX_MEASURING_MODE = 'e7add780-b042-4876-aae1-112855353cc1';

        /////////////
        // Private methods
        /////////////

        var portSettings = function () {
            return {
                service_uuid: HEART_RATE_SERVICE_UUID,
                characteristic_uuid: HEART_RATE_MEASUREMENT_UUID
            }
        };

        // Format can act on incoming data from the counter, and then
        // forwards the data to the app through a 'data' event.

        // Using https://github.com/GoogleChrome/chrome-app-samples/blob/master/samples/bluetooth-samples/heart-rate-sensor/main.js
        // as the source for BTLE Heartrate measurement
        //        (Apache License)
        var format = function (data) {
            var response = '';
            var updt = new Date().getTime();

            // The Blue Onyx simulates a Heart Rate monitor, hence the references
            // to Heart Rate below.

            // TODO: move this into its own library/class so that we can use the code
            //       for various other uses (actual Heart Rate monitors, etc)

            // The Heart Rate Measurement Characteristic does not allow 'read'
            // operations and its value can only be obtained via notifications, so the
            // |value| field might be undefined here.
            if (!data.value) {
                console.log('No Heart Rate Measurement value received yet');
                return;
            }

            var valueBytes = new Uint8Array(data.value);
            if (valueBytes.length < 2) {
                console.log('Invalid Heart Rate Measurement value');
                return;
            }

            // Keep track of the time since we last got a packet - if this is more than
            // 6 seconds, then we missed one (or more) and the CPM count cannot be trusted
            var valid = false;
            if ((updt - lastUpdate) < 6000)
                valid = true;

            // The first byte is the counts in the last 5 seconds
            var count = valueBytes[0];

            var cpm = updateCPM(count);

            var response = {
                cpm: {
                    cpm: cpm,
                    valid: true
                }
            };
            self.trigger('data', response);
        };


        /**
         * Update the current CPM
         * @param {Number} count Count in the last 5 seconds
         */
        var updateCPM = function (count) {

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

            if ((isInitialized == 1) && !stat.portopen) {
                // We now have to reopen the port
                port.open();
                return;
            }

            isopen = stat.portopen;
            if (isopen) {
                // Should run any "onOpen" initialization routine here if
                // necessary.
                console.log("Our port is now open");

                if (isInitialized == 0) {
                    console.log("Do a Onyx bootloader mode cancel");
                    port.write(abutils.str2ab("0"), {
                        service_uuid: HEART_RATE_SERVICE_UUID,
                        characteristic_uuid: BLEONYX_MEASURING_MODE
                    }, function (info) {
                        console.log('callback from write', info);
                    });
                    setTimeout(function () {
                        // We have to close the port after writing "0" :(
                        isInitialized = 1;
                        port.close();
                    }, 2000);
                } else {
                    port.subscribe({
                        service_uuid: HEART_RATE_SERVICE_UUID,
                        characteristic_uuid: HEART_RATE_MEASUREMENT_UUID
                    });
                    isInitialized = 2;
                }
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
            if (port == null) {
                port = new btleConnection(ins.get('port'), portSettings());
                port.on('data', format);
                port.on('status', status);
            }
            port.open();
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

        this.isOpenPending = function () {
            return port_open_requested;
        }

        this.getInstrumentId = function (arg) {};

        this.isStreaming = function () {
            return streaming;
        };

        // Called when the app needs a unique identifier.
        // this is a standardized call across all drivers.
        //
        // TODO: Returns the instrument GUID.
        this.sendUniqueID = function () {};

        // period in seconds
        this.startLiveStream = function (period) {};

        this.stopLiveStream = function (args) {};

        // output should return a string, and is used to format
        // the data that is sent on the serial port, coming from the
        // HTML interface.
        this.output = function (data) {
            //console.log('TX', data);
            port.write(data);
        };
    }

    _.extend(parser.prototype, Backbone.Events);
    return parser;
});