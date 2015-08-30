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
/**
 * The front-end communication manager:
 *
 *  - provides API to the backend device to use by views
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */
define(function (require) {
    "use strict";

    // linkManager is a reference to the parent link manager
    return function () {

        var self = this;
        var lm = linkManager;
        var streaming = true;

        //////
        //  Standard API:
        // All link managers need this function:
        //////
        this.getBackendDriverName = function () {
            return 'sigma25';
        }

        //////
        // End of standard API
        //////

        // All commands below are fully free and depend on
        // the instrument's capabilities

        this.version = function () {            
            lm.sendCommand({cmd: "version"} );
        };

        this.serial = function () {            
            lm.sendCommand({cmd: "serial"} );
        };

        this.stream = function(f) {
            lm.sendCommand({ cmd: "stream",
                            start: f });
        }

        console.log('Started Sigma25 front end driver..');
    }

});