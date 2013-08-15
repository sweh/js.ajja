(function($) {

gocept.jsform.Form = function () {
    this.construct.apply(this, arguments);
};

gocept.jsform.Form.prototype = {

    construct: function(id) {
        var self = this;
        self.node = $('#'+id);
    },

    init: function () {
        var self = this;
    }

};

}(jQuery));
