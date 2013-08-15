describe("Form Plugin", function() {
  var form;

  beforeEach(function() {
    form = new gocept.jsform.Form('my_form');
  });

  it("should inject a form tag into html", function() {
    form.init();
    expect(form.node).toEqual($('#my_form'));
  });

});
