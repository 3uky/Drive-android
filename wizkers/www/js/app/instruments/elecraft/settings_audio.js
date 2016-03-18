/**
 * (c) 2016 Edouard Lafargue, ed@lafargue.name
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
 * KX3 audio settings screen
 *
 * @author Edouard Lafargue, ed@lafargue.name
 *
 */

define(function(require) {
    "use strict";
    
    var $       = require('jquery'),
        _       = require('underscore'),
        Backbone = require('backbone'),
        template = require('js/tpl/instruments/elecraft/SettingsAudio.js');

    return Backbone.View.extend({

        initialize:function () {
            this.menulist = [];
            this.menumode = '';
            linkManager.on('input', this.showInput, this);
            this.elecraftRXEQ = null;
            this.elecraftTXEQ = null;
        },

        events: {
            'slideStop #cmp-control': 'setCP',
            'change .menu-dropdown': 'simpleMenuChange',
            'click .agc-spd': 'setAGCSpeed'
        },

        onClose: function() {
            linkManager.off('input', this.showInput);
            if (this.elecraftTXEQ)
                this.elecraftTXEQ.onClose();
            if (this.elecraftRXEQ)
                this.elecraftRXEQ.onClose();

        },

        render:function () {
            var self = this;
            this.$el.html(template());
            return this;
        },
        
        refresh: function() {
           var self = this;
           if (this.elecraftRXEQ == null) {
                require(['app/instruments/elecraft/equalizer'], function (view) {
                    self.elecraftRXEQ = new view({
                        eq: 'rx'
                    });
                    if (self.elecraftRXEQ != null) {
                        $('#kx3-rxeq', self.el).html(self.elecraftRXEQ.el);
                        // So that we don't overlap queries, we use an event mechanism to
                        // cascade creations and renderings:
                        self.elecraftRXEQ.once('initialized', self.makeTXEQ, self);
                        self.elecraftRXEQ.render();
                    }
                });
           }
        },
        
        makeTXEQ: function () {
            var self = this;
            require(['app/instruments/elecraft/equalizer'], function (view) {
                self.elecraftTXEQ = new view({
                    'eq': 'tx'
                });
                if (self.elecraftTXEQ != null) {
                    $('#kx3-txeq', self.el).html(self.elecraftTXEQ.el);
                    self.elecraftTXEQ.once('initialized', self.getMenus, self);
                    self.elecraftTXEQ.render();
                }
            });

        },
        
        triggerInit: function() {
            this.trigger('initialized');
        },

        setCP: function (e) {
            linkManager.driver.setCP(e.value);
        },
        
        getMenus: function() {
            // Get all Audio-related settings through the menu system
            this.menulist = [
                [ 'agc-md', 'MN128;MP;' ],
                [ 'agc-spd-ssb', 'MN129;MD2;MP;' ],
                [ 'agc-spd-cw', 'MN129;MD3;MP;'],
                [ 'agc-spd-fm', 'MN129;MD4;MP;'],
                [ 'agc-spd-am', 'MN129;MD5;MP;'],
                [ 'agc-spd-data', 'MN129;MD6;MP;'],
                [ 'agc-thr', 'MN074;SWT19;MP;'],
                [ 'agc-atk', 'MN074;SWT27;MP;'],
                [ 'agc-hld', 'MN074;SWT20;MP;'],
                [ 'agc-dcy', 'MN074;SWT28;MP;'],
                [ 'agc-slp', 'MN074;SWT21;MP;'],
                [ 'agc-pls', 'MN074;SWT29;MP;'],
                [ 'afx-md', 'MN105;MP;'],
                [ 'micbias', 'MN135;MP;'],
                [ 'micbtn' , 'MN082;MP;'],
                [ 'tx-essb', 'MN096;DS;']
            ];
            this.getNextMenu();            
        },
        
        getNextMenu: function() {
            var nxt = this.menulist.shift();
            if (nxt != undefined) {
                this.menumode = nxt[0];
                linkManager.sendCommand(nxt[1]);
            } else {
                this.menumode = '';
                console.log('Got all menu entries we needed');
                this.triggerInit();
            }
        },
        
        parseMenu: function(data) {
            var val = parseInt(data.substr(2));
            switch (this.menumode) {
                case 'agc-spd-ssb':
                    this.$('#agc-spd-ssb').html('SSB:' + (val & 0x2 ? 'Fast' : 'Slow'));
                    break;
                case 'agc-spd-cw':
                    this.$('#agc-spd-cw').html('CW:' + (val & 0x2 ? 'Fast' : 'Slow'));
                    break;
                case 'agc-spd-fm':
                    this.$('#agc-spd-fm').html('FM:' + (val & 0x2 ? 'Fast' : 'Slow'));
                    break;
                case 'agc-spd-am':
                    this.$('#agc-spd-am').html('AM:' + (val & 0x2 ? 'Fast' : 'Slow'));
                    break;
                case 'agc-spd-data':
                    this.$('#agc-spd-data').html('DATA:' + (val & 0x2 ? 'Fast' : 'Slow'));
                    break;
                case 'agc-md' :
                case 'agc-thr':
                case 'agc-atk':
                case 'agc-hld':
                case 'agc-dcy':
                case 'agc-slp':
                case 'afx-md' :
                case 'micbias': // Bit 4 is bias enable
                case 'micbtn' : // MIC BTN: bit 0 is ptt enable, bit 2 is up/dn enable
                    this.$('#' + this.menumode).val(val);
                    break;
                case 'tx-essb': // data is a DS screen
                    var txt = "";
                    val = data.substr(2);
                    for (var i = 0; i < 8; i++) {
                        if (val.charCodeAt(i) & 0x80) // Dot on the left side of the character
                            txt += ".";
                        var val2 = val.charCodeAt(i) & 0x7F;
                        // Do replacements:
                        if (val2 == 0x40)
                            val2 = 0x20;
                        txt += String.fromCharCode(val2);
                    }
                    this.$('#tx-essb').val((txt.substr(2,3) == 'OFF') ? 0: 1);
                    this.$('#tx-essb-val').val(parseFloat(txt.substr(6)));
                    break;

                    
            }
            linkManager.sendCommand('MN255;');
            this.getNextMenu();
        },
        
        simpleMenuChange: function() {
            // These are simple menus where we can just set the KX3 menu direct
            var menuNumbers = {
                 'agc-md': '128',
                 'afx-md': '105',
                 'micbias': '135',
                 'micbtn': '082',
                 'tx-essb': '096'
            };
            var v = ("000" + $(event.target).val()).slice(-3);
            var n = event.target.id;
            if (n == 'micbias' || n == 'micbtn') {
                // The KX3 refuses to modify MIC Bias in DATA mode
                linkManager.sendCommand('MD2;');
            }
            linkManager.sendCommand('MN' + menuNumbers[event.target.id] + ';MP' + v + ';MN255;');
        },
        
        setAGCSpeed: function() {
            // Toggles between slow and fast AGC speed
            console.log(event.target.id);
            var agc = $(event.target).html().split(':')[0];
            var toggles = {
                'SSB': ['agc-spd-ssb', 'MN129;MD2;'],
                'CW': ['agc-spd-cw', 'MN129;MD3;'],
                'FM': ['agc-spd-fm', 'MN129;MD4;'],
                'AM': ['agc-spd-am', 'MN129;MD5;'],
                'DATA': ['agc-spd-data', 'MN129;MD6;'],
            }
            // Enable refresh of the value by setting menumode
            this.menumode = toggles[agc][0];
            linkManager.sendCommand(toggles[agc][1] + 'UP;MP;');
        },
        
        showInput: function(data) {
            
            if (!this.$el.is(':visible'))
                return;

            var cmd = data.substr(0, 2);
            var val = data.substr(2);

            if ((cmd == 'MP' || cmd == 'DS') && this.menumode != '') {
                // Happens when we are reading from a menu
                this.parseMenu(data);
            } 
        }
    });
});