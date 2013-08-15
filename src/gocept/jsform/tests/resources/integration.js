describe("Form Plugin", function() {
  var form;

  beforeEach(function() {
    form = new gocept.jsform.Form('my_form');
  });

  it("should inject a form tag into html", function() {
    form.init();
    expect(form.node).toEqual($('#my_form'));
    expect(form.node.get(0).tagName).toEqual('FORM');
  });

  it("should inject a input field for text data", function() {
    form.init({firstname: 'Sebastian'});
    expect($('#my_form input').attr('type')).toEqual('text');
    expect($('#my_form input').attr('name')).toEqual('firstname');
    expect($('#my_form input').get(0).value).toEqual('Sebastian');
    expect(form.model.firstname()).toEqual('Sebastian');
  });

  it("should inject a select field for arrays", function() {
    form.init({title: ['Mr.', 'Mrs.']});
    expect($('#my_form select').attr('name')).toEqual('title');
    expect($('#my_form select option').get(0).value).toEqual('Mr.');
    expect($('#my_form select option').get(1).value).toEqual('Mrs.');
    expect($('#my_form select option').length).toEqual(2);
    expect(form.model.title()).toEqual([ 'Mr.', 'Mrs.' ]);
  });

  it("should inject two radio boxes for bool data", function() {
    var data = {needs_glasses: false};
    form.init(data);
    expect($('#my_form input').attr('type')).toEqual('checkbox');
    expect($('#my_form input').get(0).name).toEqual('needs_glasses');
    expect(form.model.needs_glasses()).toEqual(false);
    // By default boolean fields have no label. Specify one:
    form.init(data, {needs_glasses: {label: 'Needs glasses'}});
    expect($('#my_form').text()).toEqual(' Needs glasses');
  });

});
