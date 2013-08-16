(function($) {

gocept.jsform.Form = function () {
    this.construct.apply(this, arguments);
};

gocept.jsform.Form.prototype = {

    construct: function(id) {
        var self = this;
        self.id = id;
        self.url = null;
        self.data = null;
        self.options = {};
    },

    init: function (data_or_url, options) {
        /* Initialize the form.
         *
         * Expands the form_template into the DOM and invokes data retrieval
         * and form field initialization.
         *
         * Takes the following parameters:
         * |
         * |- data_or_url: The url to a JSON View returning the data for the
         * |               form or the data itself.
         * |- form_template: An alternate template for the form. It may
         * |                 contain ids for the fields to render them on
         * |                 custom places.
         * |- mapping:  An optional mapping for the <ko.mapping> plugin.
         * |- options:  Options passed to the form:
         *   |- save_url: The url where data changes are propagated to. Should
         *   |            return a dict with either {"status": "success"} or
         *   |            {"status": "error", "msg": "Not an eMail address."}.
         *   |- action: The url the form will submit to. Will become the
         *   |          action attribute in form.
         *   |- <field_name>: Foreach field in data you can add some options:
         *     |- label: The label of the field.
         */
        var self = this;
        if (!gocept.jsform.isUndefinedOrNull(options))
            self.options = options;
        var form_options = self.mangle_options(
            {'form_id': self.id}, self.options);
        if (gocept.jsform.isUndefinedOrNull(self.options.form_template))
            form_template = gocept.jsform.widgets.form;
        else
            form_template = self.options.form_template;
        var form_code = $(form_template.expand(form_options));
        $('#' + self.id).replaceWith(form_code);
        self.node = $('#' + self.id);
        self.node.data('form', self);
        self.prepare_data(data_or_url);
        self.init_fields();
    },

    prepare_data: function(data_or_url) {
        /* Invokes data retrieval if needed.
         *
         * After calling this method, self.data is initialized.
         */
        var self = this;
        if (typeof(data_or_url) == 'string')
            self.retrieve(data_or_url);
        else
            self.data = data_or_url;
    },

    init_fields: function() {
        /* Initialize field from self.data.
         *
         * Guess the type of data for each field and render the correct field
         * template into the DOM. Invoke the knockout databinding via
         * auto-mapping data into a model (thanks to ko.mapping plugin) and
         * invoke observing the model for changes to propagate these to the
         * server.
         *
         * Appends fields into the form if no DOM element with id name like
         * field is found.
         */
        var self = this;
        if (gocept.jsform.isUndefinedOrNull(self.data))
            return
        $.each(self.data, function (id, value) {
             var widget = self.get_widget(value);
             var widget_options = self.mangle_options(
                 {name: id, value: value}, self.options[id]);
             var widget_code = widget.expand(widget_options);
             if (!$('#'+id, self.node).length)
                 self.node.append(widget_code);
             else
                 $('#'+id, self.node).replaceWith(widget_code);
        });
        mapping = self.options['mapping'];
        if (gocept.jsform.isUndefinedOrNull(mapping))
            self.model = ko.mapping.fromJS(self.data);
        else
            self.model = ko.mapping.fromJS(self.data, mapping);
        self.observe_model_changes();
        ko.applyBindings(self.model, self.node.get(0));
    },

    subscribe: function(id, real_id) {
        /* Subscribe to changes on one field of the model and propagate them to
         * the server.
         */
        var self = this;
        self.model[id].subscribe(function(newValue) {
            if (gocept.jsform.isUndefinedOrNull(real_id))
                self.save(id, newValue);
            else
                self.save(real_id, newValue);
        });
    },

    observe_model_changes: function() {
        /* Observe changes on all fields on model. */
        var self = this;
        $.each(self.data, function (id, value) {
            if (typeof(value) == "object") {
                /* Observe select changes on selectfields. Knockout only
                 * propagates adding and removing items from selects
                 * out-of-the-box.
                 */
                self.model[id+'_selected'] = ko.observableArray();
                self.subscribe(id+'_selected', id);
            }
            self.subscribe(id);
        });
    },

    get_widget: function(value) {
        /* Retrieve the widget for a field. */
        var self = this;
        return gocept.jsform.widgets[typeof(value)]
    },

    mangle_options: function(options1, options2) {
        /* Combine two option dicts into one. */
        var self = this;
        if (gocept.jsform.isUndefinedOrNull(options2))
            var options2 = {};
        $.each(options2, function (id, value) { options1[id] = value; });
        return options1
    },

    error: function() {
        /* Error handler for ajax calls. */
        var self = this;
        self.node.append('<div class="error">There was an error during \
                          communication with the server.</div>');
    },

    retrieve: function (url) {
        /* Retrieve data from given url via ajax. */
        var self = this;
        self.url = url;

        var success = function(data) {
            self.data = data;
            self.init_fields();
        };

        $.ajax({
            dataType: "json",
            url: self.url,
            success: success,
            error: function (e) { self.error(e); }
        });
    },

    save: function (id, newValue) {
        /* Save data to the server via ajax. */
        var self = this;
        save_url = self.options['save_url'];
        if (!save_url) {
            save_url = self.url;
        }

        var success = function(data) {
            console.log('sucess');
        };

        console.debug('Posting '+newValue+' for '+id+' to '+save_url);
        $.ajax({
            type: 'POST',
            url: save_url,
            data: {id: id, value: newValue},
            success: success,
            error: function (e) { self.error(e); }
        });
    }

};

}(jQuery));
