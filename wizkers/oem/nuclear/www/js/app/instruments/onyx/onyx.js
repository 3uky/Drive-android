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

/**
 * A Safecast Onyx instrument
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */

define(function (require) {
    "use strict";

    return function () {

        // Convenient function when views want to talk to each other: keep a central
        // reference to those here
        var current_liveview = null;
        var current_numview = null;

        this.liveViewRef = function () {
            return current_liveview;
        };

        this.numViewRef = function () {
            return current_numview;
        };

        // Helper function: get driver capabilites for display.
        // returns a simple array of capabilities    
        this.getCaps = function () {
            return ["LiveDisplay", "NumDisplay", "DiagDisplay", "LogView", 'WizkersSettings',
                    "LogManagementView", "Upgrader", "WantReplay"
                   ];
        };

        // Return the type of data reading that this instrument generates. Can be used
        // by output plugins to accept data from this instrument or not.
        this.getDataType = function () {
            return ["radioactivity"];
        }


        this.getUpgrader = function (arg, callback) {
            require(['app/instruments/onyx/upgrader'], function (view) {
                callback(new view(arg));
            });
        };

        // This has to be a backbone view
        this.getSettings = function (arg, callback) {
            require(['app/instruments/onyx/settings'], function (view) {
                callback(new view(arg));
            });
        };

        // This has to be a Backbone view
        // This is the full screen live view graph (not a small widget)
        this.getLiveDisplay = function (arg, callback) {
            require(['app/instruments/onyx/display_live'], function (view) {
                current_liveview = new view(arg);
                callback(current_liveview);
            });
        };

        // This is a Backbone view
        // This is a numeric display
        this.getNumDisplay = function (arg, callback) {
            require(['app/instruments/onyx/display_numeric'], function (view) {
                current_numview = new view(arg);
                callback(current_numview);
            });
        };

        // A smaller widget (just a graph)
        this.getLiveWidget = function (arg, callback) {
            return null;
        };

        // A diagnostics/device setup screen
        this.getDiagDisplay = function (arg, callback) {
            require(['app/instruments/onyx/display_diag'], function (view) {
                callback(new view(arg));
            });
        };

        // This is the front-end driver
        this.getDriver = function(callback) {
             require(['app/instruments/onyx/driver_frontend'], function(d) {
                callback(new d());                 
             });
        };

        // This is the front-end driver for upload mode
        this.getUploader = function(callback) {
             require(['app/instruments/onyx/uploader_frontend'], function(d) {
                callback(new d());                 
             });
        };

        // This is a browser implementation of the backend driver, when we
        // run the app fully in-browser or as a Cordova native app.
        this.getBackendDriver = function (arg, callback) {
            require(['app/instruments/onyx/driver_backend'], function (driver) {
                callback(new driver(arg));
            });
        };

        // Browser implementation of the backend firmware uploader, when we
        // run the app fullun in-browser or as a Cordova native app.
        this.getBackendUploaderDriver = function (arg, callback) {
            require(['app/instruments/onyx/uploader_backend'], function (driver) {
                callback(new driver(arg));
            });
        };

        // Return a Backbone view which is a mini graph
        this.getMiniLogview = function (arg, callback) {
            return null;
        };

        // Return a device log management view
        this.getLogManagementView = function (arg, callback) {
            require(['app/instruments/onyx/display_logmanager'], function (view) {
                callback(new view(arg));
            });
        }

        // Render a log (or list of logs) for the device.
        this.getLogView = function (arg, callback) {
            require(['app/instruments/onyx/display_log'], function (view) {
                callback(new view(arg));
            });
        }

        // Render a log edit table for a log collection for the device
        this.getLogEditView = function (arg, callback) {
            require(['app/instruments/onyx/display_logedit'], function (view) {
                callback(new view(arg));
            });
        }

        // The screen for the "Settings" top level menu. This covers settings
        // for the Wizkers app, not the instrument itself (those are done on the DiagDisplay
        // screen).
        this.getWizkersSettings = function (arg, callback) {
            require(['app/instruments/blue_onyx/settings_wizkers'], function (view) {
                callback(new view(arg));
            });
        };

    };
});