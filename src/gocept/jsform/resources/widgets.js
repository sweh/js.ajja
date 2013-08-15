(function($) {

gocept.jsform.declare_namespace('gocept.jsform.widgets');

gocept.jsform.widgets.form = new jsontemplate.Template('\
<form method="POST" action="." id="{form_id}">\
</form>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.string = new jsontemplate.Template('\
<input type="text" data-bind="value: {name}" name="{name}" value="" readonly="{readonly}" />\
', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.object = new jsontemplate.Template('\
<select name="{name}" data-bind="options: {name}" readonly="{readonly}">\
</select>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.boolean = new jsontemplate.Template('\
<input type="checkbox" name="{name}" data-bind="checked: {name}">{name}</input>\
', {default_formatter: 'html',  undefined_str: ''});

}(jQuery));
