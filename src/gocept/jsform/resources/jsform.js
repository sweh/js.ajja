(function($) {

gocept.jsform.Form = function () {
    this.construct.apply(this, arguments);
};

gocept.jsform.Form.prototype = {

    construct: function(id) {
        var self = this;
        self.id = id;
    },

    init: function () {
        var self = this;
        var form_code = $(gocept.jsform.widgets.form.expand(
            {'form_id': self.id}));
        $('#' + self.id).replaceWith(form_code);
        self.node = $('#' + self.id);
    }

};

}(jQuery));
