(function($) {

gocept.jsform.Form = function () {
    this.construct.apply(this, arguments);
};

gocept.jsform.Form.prototype = {

    construct: function(id) {
        var self = this;
        self.id = id;
    },

    init: function (data_or_url) {
        var self = this;
        var form_code = $(gocept.jsform.widgets.form.expand(
            {'form_id': self.id}));
        $('#' + self.id).replaceWith(form_code);
        self.node = $('#' + self.id);
        self.init_fields(data_or_url);
    },

    init_fields: function(data_or_url) {
        var self = this;
        if (gocept.jsform.isUndefinedOrNull(data_or_url)) {
          return
        }
        var data = data_or_url;
        if (typeof(data_or_url) == 'string')
            data = self.retrieve(data_or_url);
        $.each(data, function (id, value) {
             var widget = self.get_widget(value);
             var widget_code = widget.expand({name: id, value: value});
             self.node.append(widget_code);
        });
        self.model = ko.mapping.fromJS(data);
        ko.applyBindings(self.model); //, self.node.get(0));
    },

    get_widget: function(value) {
        var self = this;
        return gocept.jsform.widgets[typeof(value)]
    },

    retrieve: function (url) {
        var self = this;
        return null;  // XXX coming soon
    },

};

}(jQuery));
