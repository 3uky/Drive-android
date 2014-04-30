/**
 * This serial lib simulates the behaviour of the node server socket
 * in the case of a Chrome packaged application.
 *
 * (c) 2014 Edouard Lafargue, ed@lafargue.name
 *
 * One of the roles of this lib is also to act as a middleman for the
 * instrument driver: it receives data from the serial port, passes it to
 * the instrument driver parser, and whenever the parser sends data back, it
 * passes it to the intrument driver 'format' command.
 */

define(function(require) {
    
    "use strict";
    
    var Backbone = require('backbone');
    var Serialport = require('serialport');

    var serialLib = function() {

        // Public methods

        // Same API as for the socket object... pretty basic implementation, I know
        this.emit = function(cmd, args) {
            switch (cmd) {
                   case 'portstatus':
                    portStatus(args);
                    break;
                   case 'openinstrument':
                    openPort(args);
                    break;
                   case 'closeinstrument':
                    closePort(args);
                    break;
                   case 'controllerCommand':
                    controllerCommand(args);
                    break;
                   case 'ports':
                    getPorts(args);
                    break;
                   case 'driver':
                    setDriver(args);
                    break;
                   default:
                    break;
            }
        };

        // Trick: 
        this.connect = function() {return this; };

        // Needs to be public (defined with this.) because
        // it is called from a callback
        this.driver = null;
        this.portOpen = false;
        this.portSettings  = null;
        this.connectionId = null;

        // Private methods / properties:
        var Debug = true;
        var self = this;
        // Parser does not need to be public...
        var parser = null;
        
        // Utility function (chrome serial wants array buffers for sending)
        // Convert string to ArrayBuffer
        function str2ab(str) {
            var buf=new ArrayBuffer(str.length);
            var bufView=new Uint8Array(buf);
            for (var i=0; i<str.length; i++) {
                bufView[i]=str.charCodeAt(i);
            }
            return buf;
        };


        // This is where we hook up the serial parser - cordova version
        function setDriver(driver) {
            console.log("Setting driver - should be " + driver);
            // We can use our instrumentManager to ask for the right driver
            // (in server-side mode, "driver" is passed as the driver name, we
            //  don't need it here!)
            instrumentManager.getBackendDriver(self, function(dr) {
                self.driver = dr;
                self.portSettings = self.driver.portSettings();
                parser = self.portSettings.parser;
            });
        }

        // We support only one default port, the serial adapter
        // connected to the OTG cable.
        function getPorts() {
            chrome.serial.getDevices(onGetDevices);
        }
        
        function onGetDevices(ports) {
            var portlist = [];
            for (var i=0; i< ports.length; i++) {
                portlist.push(ports[i].path);
            }
            self.trigger('ports', portlist);
        }

        function portStatus() {
           self.trigger('status', {portopen: self.portOpen});
        };

        function openPort(port) {
            console.log("chromeSerialLib: openPort");
            var path = instrumentManager.getInstrument().get("port");
            // TODO: support other data bit and stop bit lengths 
            chrome.serial.connect(path, { bitrate: self.portSettings.baudRate,
                                        },
                                  onOpen
                                 );        
        };

        function ab2str(buf) {
            return String.fromCharCode.apply(null, new Uint8Array(buf));
        };

        // Our Cordova serial plugin is not event-driven (yet), which means
        // that we have to call read continously, which is pretty ugly and bad for
        // battery life...
        function onRead(readInfo) {
            if (readInfo.connectionId == self.connectionId && readInfo.data) {
                // Pass this over to the parser.
                // the parser will trigger a "data" even when it is ready
                //console.log("R: " + ab2str(readInfo.data));
                parser(self,readInfo.data);
            }
        };
        
        // Called by the parser whenever data is ready to be formatted
        // by our instrument driver
        function onDataReady(data) {
            self.driver.format(data);
        }

        function onOpen(openInfo) {
            if (!openInfo) {
                console.log("Open Failed");
                return;
            }
            self.portOpen = true;
            self.connectionId = openInfo.connectionId;
            self.trigger('status', {portopen: true} );
            chrome.serial.onReceive.addListener(onRead);

        };

        function closePort(port) {
           console.log("chromeSerialLib: closePort");
            if (!self.portOpen)
                return;
            chrome.serial.disconnect( self.connectionId, function(success) {
                self.portOpen = false;
                self.trigger('status', {portopen: false} );
                console.log("chromeSerialLib: closePort success");
               }
            );
        };

        function controllerCommand(cmd) {
            if (!self.portOpen || cmd == '')
                return;
            chrome.serial.send(self.connectionId, str2ab(self.driver.output(cmd)), function() {});
        };
        
        // Now hook up our own event listeners:
        
        this.on('data', onDataReady);

    };

    // Add event management to our serial lib, from the Backbone.Events class:
    _.extend(serialLib.prototype, Backbone.Events);    
    return new serialLib;
    
});