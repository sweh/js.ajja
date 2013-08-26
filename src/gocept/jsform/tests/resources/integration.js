describe("Form Plugin", function() {
  var form;

  beforeEach(function() {
    form = new gocept.jsform.Form('my_form');
  });

  it("should inject a form tag into html", function() {
    form.load();
    expect(form.node).toBeDefined();
    expect(form.node).toEqual($('#my_form'));
    expect(form.node.get(0).tagName).toEqual('FORM');
  });

  it("can get a cusomized action url", function() {
    var options = {action: 'http://foo'};
    form = new gocept.jsform.Form('my_form', options);
    form.load();
    expect(form.node.attr('action')).toEqual('http://foo');
  });

  it("should inject a input field for text data", function() {
    form.load({firstname: 'Sebastian'});
    expect(form.model).toBeDefined();
    expect($('#my_form input').attr('type')).toEqual('text');
    expect($('#my_form input').attr('name')).toEqual('firstname');
    expect($('#my_form input').get(0).value).toEqual('Sebastian');
    expect(form.model.firstname()).toEqual('Sebastian');
  });

  it("should inject a select field for arrays", function() {
    form.load({title: [{id: 'mr', value: 'Mr.'},
                       {id: 'mrs', value: 'Mrs.'}]});
    expect($('#my_form select').attr('name')).toEqual('title');
    expect($('#my_form select option').get(0).value).toEqual('');
    expect($('#my_form select option').get(1).value).toEqual('mr');
    expect($('#my_form select option').get(1).innerHTML).toEqual('Mr.');
    expect($('#my_form select option').get(2).value).toEqual('mrs');
    expect($('#my_form select option').get(2).innerHTML).toEqual('Mrs.');
    expect($('#my_form select option').length).toEqual(3);
  });

  it("should inject two radio boxes for bool data", function() {
    var data = {needs_glasses: false};
    form.load(data);
    expect($('#my_form input').attr('type')).toEqual('checkbox');
    expect($('#my_form input').get(0).name).toEqual('needs_glasses');
    expect(form.model.needs_glasses()).toEqual(false);
    // By default boolean fields have no label. Specify one:
    form.load(data, {needs_glasses: {label: 'Needs glasses'}});
    expect($('#my_form').text()).toMatch('Needs glasses');
  });

  it("can get its data from a url", function() {
    runs(function() {
      form.load('/fanstatic/gocept.jsform.tests/testdata.json');
    });
    waits(100);
    runs(function() {
      expect($('#my_form select option').get(1).value).toEqual('mr');
    });
  });

  describe("Propagation to server", function() {

    beforeEach(function() {
      spyOn(form, "save");
    });

    afterEach(function() {
      expect(form.save).toHaveBeenCalled();
    });

    it("input fields", function() {
      form.load({firstname: 'Sebastian'});
      $('#my_form input').val('Bob').change();
    });

    it("select fields", function () {
      form.load({title: [{id: 'mr', value: 'Mr.'},
                         {id: 'mrs', value: 'Mrs.'}]});
      $('#my_form select').val('mrs').change();
    });

    it("checkboxes", function () {
      form.load({needs_glasses: false});
      $('#my_form input').click();
    });

  });

  describe("customized templates", function() {

    it("for the form", function () {

      var template = new jsontemplate.Template(
        ['<form method="POST" action="{action}" id="{form_id}">',
         '  <table><tr><td class="firstname">',
         '    <span id="firstname" />',
         '  </td><td class="lastname">',
         '    <span id="lastname" />',
         '</td></tr></table></form>'].join(''),
        {default_formatter: 'html',  undefined_str: ''});

      var form = new gocept.jsform.Form('my_form', {form_template: template});
      form.load({firstname: 'Max', lastname: 'Mustermann'});
      expect($('#my_form .firstname input').val()).toEqual('Max');
      expect($('#my_form .lastname input').val()).toEqual('Mustermann');
    });

    it("for a field type", function () {

      var template = new jsontemplate.Template(
        ['<div class="label">{label}</div>',
         '<div class="field">',
         '  <input type="radio" name="{name}" data-bind="checked: {name}" />',
         '</div>'].join(''),
        {default_formatter: 'html',  undefined_str: ''});

      var form = new gocept.jsform.Form(
        'my_form', {boolean_template: template});
      form.load({needs_glasses: false});
      expect($('#my_form input[type=checkbox]').length).toEqual(0);
      expect($('#my_form input[type=radio]').length).toEqual(1);
    });

    it("for a field explicitely", function () {

      var template = new jsontemplate.Template(
        ['<div class="title">Titel: ',
         '{.repeated section value}',
         '  <div>',
         '    <input type="radio" name="{name}" value="{id}" class="{id}"',
         '           data-bind="checked: {name}" /> {value}',
         '  </div>',
         '{.end}',
         '</div>'].join(''),
        {default_formatter: 'html',  undefined_str: ''});

      form.load({title: [{id: 'mr', value: 'Mr.'},
                         {id: 'mrs', value: 'Mrs.'}]},
                {title: {template: template}});
      spyOn(form, "save");
      $('#my_form .mrs').click().click();  // Not sure why one needs to 
                                           // trigger click twice here
      expect(form.save).toHaveBeenCalled();
    });
  });

  it("validation errors are displayed at the widget", function () {
    runs(function() {
      var form = new gocept.jsform.Form(
          'my_form', {
           save_url: '/fanstatic/gocept.jsform.tests/error.json',
           save_type: "GET"});
      form.load({email: ''});
      $('#my_form input').val('max@mustermann').change();
    });
    waits(100);
    runs(function() {
      expect($('#my_form .error.email').text()).toEqual(
         'Not a valid eMail address.');
    });
  });

  it("can display the select status of a list", function () {
    form.load({title: [{id: 'mr', value: 'Mr.'},
                       {id: 'mrs', value: 'Mrs.', selected: true}]});
    expect($('#my_form select option').get(2).selected).toEqual(true);
  });


});
