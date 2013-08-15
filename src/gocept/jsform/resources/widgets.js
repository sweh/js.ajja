(function($) {

gocept.jsform.declare_namespace('gocept.jsform.widgets');

gocept.jsform.widgets.form = new jsontemplate.Template('\
<form method="POST" action="." id="{form_id}">\
</form>', {default_formatter: 'html',  undefined_str: ''});

}(jQuery));
