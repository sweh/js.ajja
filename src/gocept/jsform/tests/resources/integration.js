describe("Form Plugin", function() {
  var form;

  beforeEach(function() {
    form = new gocept.jsform.Form('my_form');
  });

  it("should inject a form tag into html", function() {
    form.init();
    expect(form.node).toBeDefined();
    expect(form.node).toEqual($('#my_form'));
    expect(form.node.get(0).tagName).toEqual('FORM');
  });

  it("can get a cusomized action url", function() {
    var options = {action: 'http://foo'};
    form.init(null, options);
    expect(form.node.attr('action')).toEqual('http://foo');
  });

  it("should inject a input field for text data", function() {
    form.init({firstname: 'Sebastian'});
    expect(form.model).toBeDefined();
    expect($('#my_form input').attr('type')).toEqual('text');
    expect($('#my_form input').attr('name')).toEqual('firstname');
    expect($('#my_form input').get(0).value).toEqual('Sebastian');
    expect(form.model.firstname()).toEqual('Sebastian');
  });

  it("should inject a select field for arrays", function() {
    form.init({title: [{id: 'mr', value: 'Mr.'},
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
    form.init(data);
    expect($('#my_form input').attr('type')).toEqual('checkbox');
    expect($('#my_form input').get(0).name).toEqual('needs_glasses');
    expect(form.model.needs_glasses()).toEqual(false);
    // By default boolean fields have no label. Specify one:
    form.init(data, {needs_glasses: {label: 'Needs glasses'}});
    expect($('#my_form').text()).toMatch('Needs glasses');
  });

  it("can get its data from a url", function() {
    runs(function() {
      form.init('/fanstatic/gocept.jsform.tests/testdata.json');
    });
    waits(100);
    runs(function() {
      expect($('#my_form select option').get(1).value).toEqual('mr');
    });
  });

});
