(function($) {

gocept.jsform.Form = function () {
    this.construct.apply(this, arguments);
};

gocept.jsform.Form.prototype = {

    construct: function(id) {
        var self = this;
        self.id = id;
    },

    init: function (data_or_url, options) {
        var self = this;
        var form_code = $(gocept.jsform.widgets.form.expand(
            {'form_id': self.id}));
        $('#' + self.id).replaceWith(form_code);
        self.node = $('#' + self.id);
        self.prepare_data(data_or_url);
        self.init_fields(options);
    },

    prepare_data: function(data_or_url, options) {
        var self = this;
        self.data = data_or_url;
        if (typeof(data_or_url) == 'string')
            self.data = self.retrieve(data_or_url);
    },

    init_fields: function(options) {
        var self = this;
        if (gocept.jsform.isUndefinedOrNull(self.data))
            return
        if (gocept.jsform.isUndefinedOrNull(options))
            var options = {};
        $.each(self.data, function (id, value) {
             var widget = self.get_widget(value);
             var widget_options = self.mangle_options(
                 {name: id, value: value}, options[id]);
             var widget_code = widget.expand(widget_options);
             self.node.append(widget_code);
        });
        self.model = ko.mapping.fromJS(self.data);
        ko.applyBindings(self.model); //, self.node.get(0));
    },

    get_widget: function(value) {
        var self = this;
        return gocept.jsform.widgets[typeof(value)]
    },

    mangle_options: function(options1, options2) {
        if (gocept.jsform.isUndefinedOrNull(options2))
            var options2 = {};
        $.each(options2, function (id, value) { options1[id] = value; });
        return options1
    },

    retrieve: function (url) {
        var self = this;
        return null;  // XXX coming soon
    },

};

}(jQuery));
