describe("Form Plugin", function() {
  var form;

  alert = jasmine.createSpy();

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

  it('does not break if null is specified as data', function() {
    var data = {foo: null, needs_glasses: false};
    form.load(data);
    expect($('#my_form input').get(0).name).toEqual('needs_glasses');
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

  it("should send an event after loading", function() {
    var event_called = false;
    $(form).on('after-load', function() { event_called = true; });
    form.load({});
    expect(event_called).toEqual(true);
  });

  it("should send an event after saving", function() {
    var event_called = false;
    form._save = function() {
        return $.Deferred().resolve({status: 'success'});
    };
    $(form).on('after-save', function() { event_called = true; });
    form.load({'foo': 'bar'});
    runs(function() {
        form.save('foo', null);
    });
    waits(100);
    runs(function() {
        expect(event_called).toEqual(true);
    });
  });

  it("should propagate the save message from server using a trigger", function() {
    var event_options = null;
    form._save = function() {
      return $.Deferred().resolve({status: 'success', validation: 'success'})
        .promise();
    };
    $(form).on('after-save', function(event, data) {
      event_options = data;
    });
    form.load({});
    runs(function() {
      form.start_save('foo', 'bar');
    });
    waits(100);
    runs(function() {
    expect(event_options).toEqual(
      {status: 'success', validation: 'success'});
    });
  });

  describe("Propagation to server", function() {

    beforeEach(function() {
      spyOn(form, "_save").andCallThrough();
    });

    afterEach(function() {
      expect(form._save).toHaveBeenCalled();
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

    it("sends csrf token if available", function () {
      form.load({needs_glasses: false});
      $('#my_form').append(
        $('<input type="hidden" id="csrf_token" value="token" />'));
      $('#my_form input').click();
      waits(100);
      expect(form._save).toHaveBeenCalledWith(
        'needs_glasses', null, 'POST',
        '{"needs_glasses":true,"csrf_token":"token"}')
    });

  });

  describe("customized templates", function() {

    it("for the form", function () {

      var template = new jsontemplate.Template(
        ['<form method="POST" action="{action}" id="{form_id}">',
         '  <table><tr><td class="firstname">',
         '    <span id="field-firstname" />',
         '  </td><td class="lastname">',
         '    <span id="field-lastname" />',
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

  it("validation errors are displayed and cleared at the widget", function () {
    var form = new gocept.jsform.Form(
        'my_form', {
         save_url: '/fanstatic/gocept.jsform.tests/error.json',
         save_type: "GET"});
    form.load({email: ''});
    runs(function() {
      $('#my_form input').val('max@mustermann').change();
    });
    waits(100);
    runs(function() {
      expect($('#my_form .error.email').text()).toEqual(
         'Not a valid eMail address.');
    });
    runs(function() {
      form.options.save_url = '/fanstatic/gocept.jsform.tests/success.json';
      $('#my_form input').val('max@mustermann.example').change();
    });
    waits(100);
    runs(function() {
      expect($('#my_form .error.email').text()).toEqual('');
    });
  });

  it("error saving on JSON response with unknown status", function() {
    form._save = function() {
        return $.Deferred().reject();
    };
    form.load({email: ''});
    runs(function() {
      $('#my_form input').val('max@mustermann').change();
    });
    waits(100);
    runs(function() {
      expect($('#my_form .error.email').text()).toEqual(
         'This field contains unsaved changes.');
      expect($('#my_form .statusarea .error').text()).toEqual(
          'There was an error communicating with the server.' +
          'email: This field contains unsaved changes.');
    });
  });

  it("unrecoverable error on non-JSON response while saving", function() {
    form._save = function() {
        return $.Deferred().resolve('');
    };
    form.load({email: ''});

    var unrecoverable_error_triggered = false;
    $(form).on('unrecoverable-error', function() {
      unrecoverable_error_triggered = true;
    });

    runs(function() {
      $('#my_form input').val('max@mustermann').change();
    });
    waitsFor(function() { return unrecoverable_error_triggered; },
             'unrecoverable-error to be triggered', 100);
    runs(function() {
      expect(form.start_save('foo', 'bar')).not.toBeDefined();
      expect(alert).toHaveBeenCalledWith(
        'An unrecoverable error has occurred.');
    });
  });

  describe("when_saved behaviour", function() {

    it("when_saved resolves if all fields are fine", function() {
      var promise;
      form._save = function() {
        return $.Deferred().resolve({status: 'success'});
      };
      form.load({email: '', name: ''});
      runs(function() {
        $('#field-email input').val('max@mustermann.example').change();
      });
      waitsFor(function() {
        return form.field('email').data('save').state() != 'pending';
      }, 'saving field "email"', 100);
      runs(function() {
        expect(form.field('email').data('save').state()).toEqual('resolved');
        promise = form.when_saved();
      });
      waitsFor(function() {
        return promise.state() != 'pending';
      }, 'promise returned by when_saved()', 100);
      runs(function() {
        expect(promise.state()).toEqual('resolved');
      });
    });

    it("when_saved resolves after pending saves succeeded", function() {
      var trigger = $.Deferred();
      var promise;
      var _save = function() {
        return $.Deferred().resolve({status: 'success'});
      };
      form._save = function() { return trigger.then(_save); }
      form.load({email: '', name: ''});
      runs(function() {
        $('#field-email input').val('max@mustermann.example').change();
        expect(form.field('email').data('save').state()).toEqual('pending');
        promise = form.when_saved();
        expect(promise.state()).toEqual('pending');
        trigger.resolve();
      });
      waitsFor(function() {
        return promise.state() != 'pending';
      }, 'promise returned by when_saved()', 100);
      runs(function() {
        expect(form.field('email').data('save').state()).toEqual('resolved');
        expect(promise.state()).toEqual('resolved');
      });
    });

    it("when_saved rejects if any field is not fine", function() {
      var promise;
      form._save = function() { return $.Deferred().reject(); };
      form.load({email: '', name: ''});
      runs(function() {
        $('#field-email input').val('max@mustermann.example').change();
      });
      waitsFor(function() {
        return form.field('email').data('save').state() != 'pending';
      }, 'saving field "email"', 100);
      runs(function() {
        expect(form.field('email').data('save').state()).toEqual('rejected');
        promise = form.when_saved();
      });
      waitsFor(function() {
        return promise.state() != 'pending';
      }, 'promise returned by when_saved()', 100);
      runs(function() {
        expect(promise.state()).toEqual('rejected');
      });
    });

    it("when_saved rejects after any pending save failed", function() {
      var trigger = $.Deferred();
      var promise;
      var _save = function() { return $.Deferred().reject(); };
      form._save = function() { return trigger.then(_save); }
      form.load({email: '', name: ''});
      runs(function() {
        $('#field-email input').val('max@mustermann.example').change();
        expect(form.field('email').data('save').state()).toEqual('pending');
        promise = form.when_saved();
        expect(promise.state()).toEqual('pending');
        trigger.resolve();
      });
      waitsFor(function() {
        return promise.state() != 'pending';
      }, 'promise returned by when_saved()', 100);
      runs(function() {
        expect(form.field('email').data('save').state()).toEqual('rejected');
        expect(promise.state()).toEqual('rejected');
      });
    });

  });

  it("saving notification disappears after saving", function() {
    runs(function() {
      var form = new gocept.jsform.Form(
          'my_form', {
           save_url: '/fanstatic/gocept.jsform.tests/success.json',
           save_type: "GET"});
      form.load({email: ''});
      $('#my_form input').val('max@mustermann').change();
    });
    waits(100);
    runs(function() {
      expect($('#my_form .saving').length).toEqual(0);
    });
  });

  it("status messages appear in the status area, with css class", function() {
    form.status_message('foo', 'success');
      expect($('#my_form .statusarea .success').text()).toEqual('foo');
  });

  it("status messages disappear after a given duration", function() {
    runs(function() {
      form.status_message('foo', 'success', 100);
      expect($('#my_form .statusarea .success').text()).toEqual('foo');
    });
    waits(1500);  /* fadeOut(1000) */
    runs(function() {
      expect($('#my_form .statusarea .success').length).toEqual(0);
    });
  });

  it("status messages can be cleared by handle", function() {
    var handle = form.status_message('foo', 'success');
    expect($('#my_form .statusarea *').length).toEqual(1);
    form.clear_status_message(handle);
    expect($('#my_form .statusarea *').length).toEqual(0);
  });

  it("can display the select status of a list", function () {
    form.load({title: [{id: 'mr', value: 'Mr.'},
                       {id: 'mrs', value: 'Mrs.', selected: true}]});
    expect($('#my_form select option').get(2).selected).toEqual(true);
  });

  it("can reload the form", function () {
    form.load({firstname: 'Sebastian'});
    $('#my_form input').val('Bob').change();
    expect($('#my_form input').val()).toEqual('Bob');
    form.reload();
    expect($('#my_form input').val()).toEqual('Sebastian');
  });

  it("can reload the form from a url", function () {
    runs(function() {
      form.load('/fanstatic/gocept.jsform.tests/testdata.json');
    });
    waits(100);
    runs(function() {
      $('#my_form input').val('Bob').change();
      expect($('#my_form input').get(0).value).toEqual('Bob');
    });
    runs(function() {
      form.reload();
    });
    waits(100);
    runs(function() {
      expect($('#my_form input').get(0).value).toEqual('Sebastian');
    });
  });


});
