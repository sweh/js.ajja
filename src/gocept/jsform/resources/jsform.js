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
        var self = this;
        if (!gocept.jsform.isUndefinedOrNull(options))
            self.options = options;
        var form_options = self.mangle_options(
            {'form_id': self.id}, self.options);
        var form_code = $(gocept.jsform.widgets.form.expand(form_options));
        $('#' + self.id).replaceWith(form_code);
        self.node = $('#' + self.id);
        self.prepare_data(data_or_url);
        self.init_fields();
    },

    prepare_data: function(data_or_url) {
        var self = this;
        if (typeof(data_or_url) == 'string')
            self.retrieve(data_or_url);
        else
            self.data = data_or_url;
    },

    init_fields: function() {
        var self = this;
        if (gocept.jsform.isUndefinedOrNull(self.data))
            return
        $.each(self.data, function (id, value) {
             var widget = self.get_widget(value);
             var widget_options = self.mangle_options(
                 {name: id, value: value}, self.options[id]);
             var widget_code = widget.expand(widget_options);
             self.node.append(widget_code);
        });
        self.model = ko.mapping.fromJS(self.data);
        ko.applyBindings(self.model, self.node.get(0));
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
        self.url = url;

        var success = function(data) {
            self.data = data;
            self.init_fields();
        };

        $.ajax({
            dataType: "json",
            url: self.url,
            success: success
        });
    },

};

}(jQuery));
