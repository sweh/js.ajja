/*global gocept, jsontemplate, ko */

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
       * - form_template:    An alternative template for the form. It may
       *                     contain ids for the fields to render them on
       *                     custom places.
       * - field_wrapper_template:
       *                     An alternative template for wrapping the
       *                     fields. This has to be compatible to the used
       *                     form template, i.e. the element with ids of the 
       *                     fields must match the used form_template. The
       *                     template gets expanded with 2 variables:
       *                        * id (id of the field)
       *                        * widget (actual widget code)
       * - string_template:  An alternative template for text based fields.
       * - object_template:  An alternative template for input based fields.
       * - boolean_template: An alternative template for boolean based fields.
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
      self.initial_data = null;
      self.data = {};
      self.options = {action: ''};
      self.csrf_token_id = 'csrf_token';
      self.mapping = {};
      if (!gocept.jsform.isUndefinedOrNull(options))
        self.options = options;
      self.create_form();
      $(self).on('server-responded', self.retry);
      self.unrecoverable_error = false;
      $(self).on('unrecoverable-error', function() {
        self.unrecoverable_error = true;
        alert('An unrecoverable error has occurred.');
      });
      if (gocept.jsform.isUndefinedOrNull(self.options.field_wrapper_template))
        self.field_wrapper_template = self.get_template('gocept_jsform_templates_field_wrapper');
      else
        self.field_wrapper_template = self.get_template(self.options.field_wrapper_template);
    },

    create_form: function() {
      /* Expands the form_template into the DOM */
      var self = this;
      var form_template = self.get_template(gocept.jsform.or(
        self.options.form_template, 'gocept_jsform_templates_form'));
      var form_options = $.extend({'form_id': self.id}, self.options);
      var form_code = $(
        form_template.expand(form_options).replace(/^\s+|\s+$/g, ''));
      $('#' + self.id).replaceWith(form_code);
      self.node = $('#' + self.id);
      self.node.data('form', self);
      self.statusarea = self.node.find('.statusarea');
    },

    reload: function() {
        var self = this;
        self.create_form();
        self.start_load();
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
      if (typeof(data_or_url) == 'string') {
        self.url = data_or_url;
      } else {
        self.initial_data = data_or_url;
      }
      if (gocept.jsform.isUndefinedOrNull(options))
        options = {};
      $.extend(self.options, options);
      if (!gocept.jsform.isUndefinedOrNull(mapping))
        self.mapping = mapping;
      self.start_load();
    },

    start_load: function() {
      /* Invokes data retrieval if needed.
       *
       * After retrieval (which may be asynchronous), self.data is initialized.
       */
      var self = this;
      if (self.url !== null) {
          self.reload_data(function(data) { self.finish_load(data); });
      } else {
        self.finish_load(self.initial_data);
      }
    },

    reload_data: function(cb) {
        //Only reload data and call cb with it.
        var self = this;
        $.ajax({
          dataType: "json",
          url: self.url,
          success: function (data) { 
              cb(data); 
          },
          error: function (e) { self.notify_server_error(e); }
        });
    },

    finish_load: function(data) {
        var self = this;
        self.set_data(data);
        self.init_fields();
        $(self).trigger('after-load');
    },

    set_data: function(data) {
      var self = this;
      if (gocept.jsform.isUndefinedOrNull(data)) {
        return;
      }
      $.each(data, function (id, value) {
        if (gocept.jsform.isUndefinedOrNull(value)) {
          //console.warn("Got `null` as value for `" + id + "`. Ignoring.");
          return;
        } else {
          self.data[id] = value;
        }
      });
    },

    get_template: function(template) {
      var self = this;
      if (template.render)
        return template;

      var html;
      if (template.indexOf('>') !== -1) {
        html = template;
      } else if (template.indexOf('#') === 0) {
        html = $(template).html();
      } else {
        html = $('#' + template).html();
      }
      return new jsontemplate.Template(
        html, {default_formatter: 'html',  undefined_str: ''});
    },

    render_widget: function(id, value) {
      var self = this;
      var widget = self.get_template(self.get_widget(id, value));
      var widget_options = $.extend(
        {name: id, value: value, label: ''}, self.options[id]);
      var widget_code = widget.expand(widget_options);
      var wrapper_options = {id: id, widget_code: widget_code}
      widget_code = self.field_wrapper_template.expand(wrapper_options)
      if (!$('#field-'+id, self.node).length)
        self.node.append(widget_code);
      else
        $('#field-'+id, self.node).replaceWith(widget_code);
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
        return;
      $.each(self.data, function (id, value) {
          self.render_widget(id, value);
      });
      self.update_bindings();
    },

    update_bindings: function() {
      var self = this;
      if (gocept.jsform.isUndefinedOrNull(self.mapping))
        self.model = ko.mapping.fromJS(self.data);
      else
        self.model = ko.mapping.fromJS(self.data, self.mapping);
      self.subscriptions = {};
      self.observe_model_changes();
      ko.applyBindings(self.model, self.node.get(0));
    },

    field: function(id) {
      var self = this;
      return self.node.find('#field-' + id + ' .field');
    },

    subscribe: function(id, real_id) {
      /* Subscribe to changes on one field of the model and propagate them to
       * the server.
       */
      var self = this;
      self.subscriptions[id] = self.model[id].subscribe(function(newValue) {
        self.save(gocept.jsform.or(real_id, id), newValue);
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
              if (obj.selected)
                  initial_values.push(obj.id);
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
      if (gocept.jsform.isUndefinedOrNull(self.options[id]) ||
          gocept.jsform.isUndefinedOrNull(self.options[id].template)) {
        var type = typeof(value);
        return gocept.jsform.or(self.options[type + '_template'],
                                'gocept_jsform_templates_' + type);
      } else {
        return self.options[id].template;
      }
    },

    save: function (id, newValue) {
      /* Schedule saving one field's value to the server via ajax. */
      var self = this;
      var deferred_save = $.when(self.field(id).data('save')).then(
        /* For the time being, simply chain the new save after the last, no
           compression of queued save calls yet. */
        function () {return self.start_save(id, newValue);},
        function () {return self.start_save(id, newValue);}
      );
      self.field(id).data('save', deferred_save);
    },

    start_save: function(id, newValue) {
      /* Actual work of preparing and making the ajax call. May be deferred in
         order to serialise saving subsequent values of each field. */
      var self = this;

      if (self.unrecoverable_error) {
        return;
      }

      var saving_msg_node = self.notify_saving(id);
      return self.save_and_validate(id, newValue)
      .always(function() {
        self.clear_saving(id, saving_msg_node);
        self.clear_field_error(id);
      })
      .done(function() {
        self.highlight_field(id, 'success');
        self.status_message('Successfully saved value.', 'success', 1000);
      })
      .progress(function() {
        self.clear_saving(id, saving_msg_node);
        self.notify_field_error(id, 'This field contains unsaved changes.');
      })
      .fail(function(msg) {
        self.notify_field_error(id, msg);
      })
      .always(function(data_or_msg) {
        $(self).trigger('after-save', [data_or_msg]);
      });
    },

    save_and_validate: function(id, newValue) {
      var self = this;
      var save_url = self.options.save_url;
      if (!save_url) {
        save_url = self.url;
      }
      var save_type = self.options.save_type;
      if (!save_type) {
        save_type = "POST";
      }

      var data = {};
      data[id] = newValue;
      if ($('#'+self.csrf_token_id).length) {
        data[self.csrf_token_id] = $('#'+self.csrf_token_id).val();
      }

      var validated = $.Deferred();

      self._save(id, save_url, save_type, ko.toJSON(data))
      .always(function() {
        self.clear_server_error();
      })
      .done(function(data) {
        if (data.status == 'error') {
          validated.reject(data.msg);
        } else if (data.status == 'success') {
          validated.resolve(data);
        } else {
          $(self).trigger('unrecoverable-error');
          return;
        }
        $(self).trigger('server-responded');
      })
      .fail(function() {
        $(self).one('retry', function() {
          self.start_save(id, newValue)
            .done(validated.resolve)
            .fail(validated.reject)
            .progress(validated.notify);
        });
        validated.notify();
        self.notify_server_error();
      });

      return validated.promise();
    },

    _save: function (id, save_url, save_type, data) {
      /* Method that takes ajax parameters, factored out for testability. */
      return $.ajax({
        url: save_url,
        type: save_type,
        data: data,
        contentType: 'application/json'
      });
    },

    when_saved: function (retry) {
      var self = this;

      if (typeof(retry) == 'undefined') {
        retry = true;
      }

      var deferred_saves = [];
      self.node.find('.field').each(function (index, field) {
        deferred_saves.push($(field).data('save'));
      });
      var aggregate = $.when.apply(null, deferred_saves);

      var result = $.Deferred();
      var consumed_past = false;
      if (retry) {
        aggregate
          .done(result.resolve)
          .fail(result.reject)
          .progress(function(msg) {
            if (consumed_past) { result.notify(msg); }
          });
      } else {
        aggregate
          .done(result.resolve)
          .fail(function() { result.reject('invalid'); })
          .progress(function() {
            if (consumed_past) { result.reject('retry'); }
          });
      }
      consumed_past = true;
      return result.promise();
    },

    retry: function() {
      var self = this;
      $(self).trigger('retry');
    },

    save_remaining: function() {
      var self = this;
      $.each(self.data, function(id, value) {
        if (gocept.jsform.isUndefinedOrNull(self.field(id).data('save'))) {
          self.save(id, value);
        }
      });
    },

    notify_field_error: function(id, msg) {
      var self = this;
      self.clear_field_error(id);
      var error_node = self.node.find('.error.' + id);
      error_node.text(msg);
      self.highlight_field(id, 'error');
      error_node.data(
          'status_message', self.status_message(id + ': ' + msg, 'error'));
    },

    clear_field_error: function(id) {
      var self = this;
      var error_node = self.node.find('.error.' + id);
      error_node.text('');
      self.clear_status_message(error_node.data('status_message'));
      error_node.data('status_message', null);
    },

    notify_server_error: function() {
      /* Announce HTTP faults during ajax calls. */
      var self = this;
      self.clear_server_error();
      self.server_error_status_message = self.status_message(
          'There was an error communicating with the server.', 'error');
    },

    clear_server_error: function() {
      /* Clear any announcement of an HTTP fault during an ajax call. */
      var self = this;
      self.clear_status_message(self.server_error_status_message);
      self.server_error_status_message = null;
    },

    notify_saving: function(id) {
      var self = this;
      self.field(id).addClass('saving');
      return self.status_message('Saving ' + id, 'saving');
    },

    clear_saving: function(id, msg_node) {
      var self = this;
      self.field(id).removeClass('saving');
      self.clear_status_message(msg_node);
    },

    highlight_field: function(id, status) {
      var self = this;
      var field = self.field(id);
      field.addClass(status);
      field.delay(300);
      field.queue(function() {
        $(this).removeClass(status).dequeue();
      });
    },

    status_message: function(message, status, duration) {
      var self = this;
      var msg_node = $('<div></div>').text(message);
      msg_node.addClass('statusmessage ' + status);
      if (!gocept.jsform.isUndefinedOrNull(duration)) {
          msg_node.delay(duration).fadeOut(
              1000, function(){msg_node.remove();});
      }
      self.statusarea.append(msg_node);
      self.statusarea.scrollTop(self.statusarea.height());
      return msg_node;
    },

    clear_status_message: function(msg_node) {
      if (!gocept.jsform.isUndefinedOrNull(msg_node)) {
        msg_node.remove();
      }
    }
  };

}(jQuery));
