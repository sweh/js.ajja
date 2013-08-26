(function($) {
  "use strict";

  gocept.jsform.Form = function () {
    this.construct.apply(this, arguments);
  };

  gocept.jsform.Form.prototype = {

    construct: function(id, options) {
      /* Exand the form under #id.
       *
       * Options can be:
       *
       * - form_template:    An alternate template for the form. It may
       *                     contain ids for the fields to render them on
       *                     custom places.
       * - string_template:  An alternate template for text based fields.
       * - object_template:  An alternate template for input based fields.
       * - boolean_template: An alternate template for boolean based fields.
       * - save_url:         The url where data changes are propagated to.
       *                     Should return a dict with either {"status":
       *                     "success"} or {"status": "error", "msg":
       *                     "Not an eMail address."}.
       * - action:           The url the form will submit to (if intended).
       *                     Will become the action attribute in form.
       */
      var self = this;
      self.id = id;
      self.url = null;
      self.data = null;
      self.options = {};
      self.mapping = {};
      if (!gocept.jsform.isUndefinedOrNull(options))
        self.options = options;
      self.create_form();
    },

    create_form: function() {
      /* Expands the form_template into the DOM */
      var self = this;
      if (gocept.jsform.isUndefinedOrNull(self.options.form_template))
        var form_template = gocept.jsform.widgets.form;
      else
        var form_template = self.options.form_template;
      var form_options = self.mangle_options({'form_id': self.id},
                                             self.options);
      var form_code = $(form_template.expand(form_options));
      $('#' + self.id).replaceWith(form_code);
      self.node = $('#' + self.id);
      self.node.data('form', self);
    },

    load: function (data_or_url, options, mapping) {
      /* Invokes data retrieval and form field initialization.
       *
       * Takes the following parameters:
       * |
       * |- data_or_url: The url to a JSON View returning the data for the
       * |               form or the data itself.
       * |- options: Options for each data field:
       *   |- <field_name>: Foreach field in data you can add some options:
       *     |- label: The label of the field.
       *     |- template: A custom template for this field.
       * |- mapping:  An optional mapping for the <ko.mapping> plugin.
       */
      var self = this;
      if (gocept.jsform.isUndefinedOrNull(options))
        options = {};
      self.mangle_options(self.options, options)
      if (!gocept.jsform.isUndefinedOrNull(options))
        self.mapping = mapping
      self.prepare_data(data_or_url);
      self.init_fields();
    },

    prepare_data: function(data_or_url) {
      /* Invokes data retrieval if needed.
       *
       * After calling this method, self.data is initialized.
       */
      var self = this;
      if (typeof(data_or_url) == 'string')
        self.retrieve(data_or_url);
      else
        self.data = data_or_url;
    },

    init_fields: function() {
      /* Initialize field from self.data.
       *
       * Guess the type of data for each field and render the correct field
       * template into the DOM. Invoke the knockout databinding via
       * auto-mapping data into a model (thanks to ko.mapping plugin) and
       * invoke observing the model for changes to propagate these to the
       * server.
       *
       * Appends fields into the form if no DOM element with id name like
       * field is found.
       */
      var self = this;
      if (gocept.jsform.isUndefinedOrNull(self.data))
        return
      $.each(self.data, function (id, value) {
         var widget = self.get_widget(id, value);
         var widget_options = self.mangle_options(
           {name: id, value: value}, self.options[id]);
         var widget_code = widget.expand(widget_options);
         widget_code = '<div class="error '+ id + '"></div>' + widget_code;
         if (!$('#'+id, self.node).length)
           self.node.append(widget_code);
         else
           $('#'+id, self.node).replaceWith(widget_code);
      });
      if (gocept.jsform.isUndefinedOrNull(self.mapping))
        self.model = ko.mapping.fromJS(self.data);
      else
        self.model = ko.mapping.fromJS(self.data, self.mapping);
      self.observe_model_changes();
      ko.applyBindings(self.model, self.node.get(0));
    },

    subscribe: function(id, real_id) {
      /* Subscribe to changes on one field of the model and propagate them to
       * the server.
       */
      var self = this;
      self.model[id].subscribe(function(newValue) {
        if (gocept.jsform.isUndefinedOrNull(real_id))
          self.save(id, newValue);
        else
          self.save(real_id, newValue);
      });
    },

    observe_model_changes: function() {
      /* Observe changes on all fields on model. */
      var self = this;
      $.each(self.data, function (id, value) {
        if (typeof(value) == "object") {
          /* Observe select changes on selectfields. Knockout only
           * propagates adding and removing items from selects
           * out-of-the-box.
           */
          var initial_values = [];
          $.each(self.data[id], function (index, obj) {
              if (obj['selected'])
                  initial_values.push(obj['id']);
          });
          self.model[id+'_selected'] = ko.observableArray(initial_values);
          self.subscribe(id+'_selected', id);
        }
        self.subscribe(id);
      });
    },

    get_widget: function(id, value) {
      /* Retrieve the widget for a field. */
      var self = this;
      if ((gocept.jsform.isUndefinedOrNull(self.options[id])) ||
          (gocept.jsform.isUndefinedOrNull(self.options[id]['template']))) {
        var type = typeof(value);
        if (gocept.jsform.isUndefinedOrNull(self.options[type+'_template']))
          return gocept.jsform.widgets[type];
        else
          return self.options[type+'_template'];
      } else {
        return self.options[id]['template'];
      }
    },

    mangle_options: function(options1, options2) {
      /* Combine two option dicts into one. */
      var self = this;
      if (gocept.jsform.isUndefinedOrNull(options2))
        var options2 = {};
      $.each(options2, function (id, value) { options1[id] = value; });
      return options1
    },

    retrieve: function (url) {
      /* Retrieve data from given url via ajax. */
      var self = this;
      self.url = url;

      $.ajax({
        dataType: "json",
        url: self.url,
        success: function (data) { self.handle_retrieve(data); },
        error: function (e) { self.handle_error(e); }
      });
    },

    save: function (id, newValue) {
      /* Save data to the server via ajax. */
      var self = this;
      var save_url = self.options['save_url'];
      if (!save_url) {
        save_url = self.url;
      }

      console.debug('Posting '+newValue+' for '+id+' to '+save_url);
      $.ajax({
        url: save_url,
        type: 'POST',
        data: {id: id, value: newValue},
        success: function(data) { self.handle_save(data, id); },
        error: function (e) { self.handle_error(e); }
      });
    },

    handle_error: function() {
      /* Error handler for ajax calls. */
      var self = this;
      self.node.append(['<div class="error">There was an error during ',
                        'communication with the server.</div>'].join(''));
    },

    handle_retrieve: function(data) {
      var self = this;
      self.data = data;
      self.init_fields();
    },

    handle_save: function(data, id) {
      var self = this;
      console.log('success');
      if (data['status'] == 'error') {
        self.node.find('.error.'+id).text(data['msg']);
      }
    }

  };

}(jQuery));
