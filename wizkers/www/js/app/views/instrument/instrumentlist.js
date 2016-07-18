/**
 * This file is part of Wizkers.io
 *
 * The MIT License (MIT)
 *  Copyright (c) 2016 Edouard Lafargue, ed@wizkers.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Defines a list of instruments, arranged as a series of 'cards'
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */

define(function (require) {

    "use strict";

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        Paginator = require('app/views/paginator'),
        utils = require('app/utils'),
        template = require('js/tpl/InstrumentListItemView.js');

    var InstrumentListItemView = Backbone.View.extend({

        tagName: "div",
        className: "col-md-2 col-xs-6",

        initialize: function (options) {
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.close, this);
            this.edit = options.edit;
            linkManager.on('instrumentStatus', this.updateStatus, this);
        },

        render: function () {
            this.$el.html(template({
                instrument: this.model.toJSON(),
                edit: this.edit
            }));
            // Check whether the instrument is connected
            linkManager.isInstrumentOpen(this.model.id);
            return this;
        },

        onClose: function () {
            console.log('[insdetail]', this.model.id, 'close');
            linkManager.off('instrumentStatus', this.updateStatus);
        },

        updateStatus: function (status) {
            if (status.id != this.model.id)
                return;
            if (status.open) {
                $('#connected', this.el).show();
            }
        },

        events: {
            "click .select": "selectInstrument",
            "click .edit": "editInstrument"
        },

        editInstrument: function (event) {
            var url = event.target.href.substr(event.target.baseURI.length);
            router.navigate(url, {
                trigger: true
            });
            event.stopPropagation();
        },

        selectInstrument: function (event) {
            console.log('Instrument selected: ' + this.model.id);
            var theID = this.model.id;

            // Detect if we clicked on a new instrument or not:
            if (instrumentManager.getInstrument() && (this.model.id == instrumentManager.getInstrument().id)) {
                // If so, just return to main screen
                router.navigate('/', true);
                return;
            }
            // Now store the instrument ID in our settings
            // Note: this is only to remember it at next application start.
            settings.set({
                currentInstrument: theID
            });
            // If the settings changed, the router will pick this up since
            // it listens to change events in settings, and react accordingly.
            settings.save(null, {
                success: function () {}
            });

            // Explicitely switch the instrument in the router.
            router.switchinstrument(theID);
            return false;
        },
    });

    return Backbone.View.extend({

        initialize: function (options) {
            this.options = options ||  {};
            // We need to keep track of all the instrument thumbnail subviews so that
            // we can call the onClose method to unsubscribe from the events, otherwise
            // we'll get ghost events:
            this.inslist = [];
        },

        onClose: function () {
            console.log("[Instrument List] OnClose");
            var s = this.inslist.length;
            for (var i = 0; i < s; i++) {
                var ins = this.inslist.pop();
                ins.onClose();
                ins.remove();
                ins.off(); // Unbinds all callbacks on this view
            }
        },

        render: function () {
            var instruments = this.model.models;
            var len = instruments.length;

            var items = 6;
            var startPos = (this.options.page - 1) * items;
            var endPos = Math.min(startPos + items, len+1);

            this.$el.html('<div class="col-md-12 thumbnails"></div>');
            var editok = true;
            // Ask to hide the instrument setting in case we are a viewer or operator in server mode, because
            // the server won't let us retrieve the instrument parmeters anyway
            if (vizapp.type == 'server') {
                if (settings.get('currentUserRole') == 'viewer')
                    editok = false;
            }

            var rowName = 'row0';
            if (!utils.checkBreakpoint('xs')) {
                    this.$('.thumbnails').append('<div class="row row0"></div>');
                }
            for (var i = startPos; i < endPos; i++) {
                // If we are on a XS screen, make sure we have a nice row break
                // and no funky layout
                if (utils.checkBreakpoint('xs') && !((i-startPos) % 2)) {
                    rowName = 'row' + Math.floor((i-startPos)/2);
                    this.$('.thumbnails').append('<div class="row ' + rowName  + '"></div>');
                }
                if (i < len) {
                    this.inslist.push(new InstrumentListItemView({
                        model: instruments[i],
                        edit: editok
                    }));
                    $('.' + rowName, this.el).append(this.inslist[this.inslist.length - 1].render().el);
                } else {
                    // Add a "Add Instrument" card at the end:
                    $('.' + rowName, this.el).append('<div class="col-md-2 col-xs-6"><div class="panel panel-default"><div class="panel-heading"><h6>Add instrument</h6></div><div class="panel-body select" style="text-align: center;" ><a href="#instruments/add" class="plain"><p style="font-size:5em; margin-bottom:0px;"><span class="glyphicon glyphicon-plus-sign"></span></p><p>New</p></a></div></div></div>');
                }
            }

            this.$el.append(new Paginator({
                model: this.model,
                page: this.options.page,
                viewname: 'instruments',
                items: items
            }).render().el);




            return this;
        }
    });

});