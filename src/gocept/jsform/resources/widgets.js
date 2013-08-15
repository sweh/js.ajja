(function($) {

gocept.jsform.declare_namespace('gocept.jsform.widgets');

gocept.jsform.widgets.form = new jsontemplate.Template('\
<form method="POST" action="." id="{form_id}">\
</form>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.string = new jsontemplate.Template('\
<input type="text" name="{name}" value="{value}" readonly="{readonly}" />\
', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.object = new jsontemplate.Template('\
<select name="{name}" readonly="{readonly}">\
  {.repeated section value}\
    <option value="{id}">{value}</option>\
  {.end}\
</select>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.boolean = new jsontemplate.Template('\
<input type="radio" name="{name}" value="yes">Yes</input><br />\
<input type="radio" name="{name}" value="no">No</input>\
', {default_formatter: 'html',  undefined_str: ''});

}(jQuery));
