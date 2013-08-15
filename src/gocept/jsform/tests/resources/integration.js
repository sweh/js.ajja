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
    expect($('#my_form input').attr('value')).toEqual('Sebastian');
  });

  it("should inject a select field for arrays", function() {
    form.init({title: [{id: 'mr', value: 'Mr.'},
                       {id: 'mrs', value: 'Mrs.'}]});
    expect($('#my_form select').attr('name')).toEqual('title');
    expect($('#my_form select option').get(0).value).toEqual('mr');
    expect($('#my_form select option').get(1).value).toEqual('mrs');
    expect($('#my_form select option').get(0).innerHTML).toEqual('Mr.');
    expect($('#my_form select option').get(1).innerHTML).toEqual('Mrs.');
    expect($('#my_form select option').length).toEqual(2);
  });

  it("should inject two radio boxes for bool data", function() {
    form.init({needs_glasses: false});
    expect($('#my_form input').attr('type')).toEqual('radio');
    expect($('#my_form input').get(0).name).toEqual('needs_glasses');
    expect($('#my_form input').length).toEqual(2);
  });

});
