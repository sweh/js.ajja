(function($) {

  var isUndefinedOrNull = function(o) {
    if (!(typeof(o) == 'undefined' || o === null)) {
      return false;
    }
    return true;
  };

  var declare_namespace = function(namespace) {
    var obj = window;
    $.each(namespace.split('.'), function(i, name) {
      if (isUndefinedOrNull(obj[name])) {
        obj[name] = {};
      }
      obj = obj[name];
    });
  };

  declare_namespace('gocept.jsform');
  gocept.jsform.declare_namespace = declare_namespace;
  gocept.jsform.isUndefinedOrNull = isUndefinedOrNull;

}(jQuery));

