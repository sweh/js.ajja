(function($) {

gocept.jsform.declare_namespace('gocept.jsform.widgets');

gocept.jsform.widgets.form = new jsontemplate.Template('\
<form method="POST" action="{action}" id="{form_id}">\
</form>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.string = new jsontemplate.Template('\
<div class="label">{label}</div>\
<div class="field">\
  <input type="text" data-bind="value: {name}" name="{name}" value=""\
         readonly="{readonly}" />\
</div>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.object = new jsontemplate.Template('\
<div class="label">{label}</div>\
<div class="field">\
  <select name="{name}" data-bind="options: {name},\
                                   optionsCaption: \' \',\
                                   optionsText: \'value\',\
                                   optionsValue: \'id\'"\
          readonly="{readonly}">\
  </select>\
</div>', {default_formatter: 'html',  undefined_str: ''});

gocept.jsform.widgets.boolean = new jsontemplate.Template('\
<div class="label">{label}</div>\
<div class="field">\
  <input type="checkbox" name="{name}" data-bind="checked: {name}" />\
</div>', {default_formatter: 'html',  undefined_str: ''});

}(jQuery));
