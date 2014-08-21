/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	// -*- js-indent-level: 2; -*-
	/*global Class, gocept, jsontemplate, ko */

	__webpack_require__(1);
	__webpack_require__(2);

	(function($) {
	  "use strict";

	  gocept.jsform.locales = {};
	  gocept.jsform.locales.en = {
	    successfully_saved_value: 'Successfully saved value.',
	    field_contains_unsaved_changes: 'This field contains unsaved changes.',
	    communication_error: 'There was an error communicating with the server.',
	    required_field_left_blank: 'This field is required but has no input.',
	    saving: 'Saving'
	  };
	  gocept.jsform.locales.de = {
	    successfully_saved_value: 'Feld wurde gespeichert.',
	    field_contains_unsaved_changes: 'Dieses Feld enthält nicht gespeicherte Änderungen.',
	    communication_error: 'Es gab einen Fehler bei der Kommunikation mit dem Server.',
	    required_field_left_blank: 'Dieses Pflichtfeld wurde nicht ausgefüllt.',
	    saving: 'Speichere'
	  };

	  gocept.jsform.get_template = function(template) {
	      var self = this;
	      if (template.render)
	        return template;

	      var html;
	      if (template.indexOf('>') !== -1) {
	        html = template;
	      } else if (template.indexOf('#') === 0) {
	        html = $(template).html();
	      } else if ($('#' + template).length) {
	        html = $('#' + template).html();
	      } else {
	        html = __webpack_require__(3)(""template + '.pt');
	      }
	      return new jsontemplate.Template(
	        html, {default_formatter: 'html',  undefined_str: ''});
	  };

	  gocept.jsform.Form = Class.$extend({

	    __init__: function(id, options) {
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
	       * - language:         2-char language code. Default is en.
	       */
	      var self = this;
	      self.id = id;
	      self.url = null;
	      self.initial_data = null;
	      self.data = {};
	      self.subscriptions = {};
	      self.options = {action: '', language: 'en'};
	      $.extend(self.options, options);
	      self.csrf_token_id = 'csrf_token';
	      self.mapping = {};
	      self.texts = gocept.jsform.locales[self.options.language];
	      self.create_form();
	      $(self).on('server-responded', self.retry);
	      self.unrecoverable_error = false;
	      $(self).on('unrecoverable-error', function(event, msg) {
	        self.unrecoverable_error = true;
	        self.unrecoverable_error_msg = msg;
	        alert('An unrecoverable error has occurred: ' + msg);
	      });
	      if (gocept.jsform.isUndefinedOrNull(self.options.field_wrapper_template))
	        self.field_wrapper_template = self.get_template('gocept_jsform_templates_field_wrapper');
	      else
	        self.field_wrapper_template = self.get_template(self.options.field_wrapper_template);
	      self.loaded = $.Deferred();
	      $(self).bind('after-load', function() {
	        self.loaded.resolve();
	      });
	    },

	    t: function(msgid) {
	        var self = this;
	        return self.texts[msgid];
	    },

	    expand_form: function() {
	      /* Expands the form_template into the DOM */
	      var self = this;
	      var form_template = self.get_template(gocept.jsform.or(
	        self.options.form_template, 'gocept_jsform_templates_form'));
	      var form_options = $.extend({'form_id': self.id}, self.options);
	      var form_code = $(
	        form_template.expand(form_options).replace(/^\s+|\s+$/g, ''));
	      $('#' + self.id).replaceWith(form_code);
	    },

	    create_form: function() {
	      /* wires the form DOM node and object */
	      var self = this;
	      if (self.options.form_template !== '') {
	        self.expand_form();
	      }
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
	       *     |- required: boolean, whether this is a required field
	       *     |- source: array of objects containing 'token' and 'title'
	       *     |- multiple: for object selection, whether to do multi-select
	       * |- mapping:  An optional mapping for the <ko.mapping> plugin.
	       */
	      var self = this;
	      if (typeof(data_or_url) == 'string') {
	        self.url = data_or_url;
	      } else {
	        self.initial_data = data_or_url;
	      }
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
	      self.loaded = $.Deferred();  // replace to represent a new load cycle
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
	        $.extend(self.data, data);
	        self.init_fields();
	        $(self).trigger('after-load');
	    },

	    get_template: gocept.jsform.get_template,

	    render_widget: function(id, value) {
	      var self = this;
	      var widget = self.get_template(self.get_widget(id, value));
	      var widget_options = $.extend(
	        {name: id,
	         value: value,
	         label: ''
	        }, self.options[id]);
	      var widget_code = widget.expand(widget_options);
	      var wrapper_options = $.extend(
	          {id: id,
	           widget_code: widget_code
	          }, widget_options);
	      widget_code = self.field_wrapper_template.expand(wrapper_options);
	      if (!$('#field-'+id, self.node).length)
	        self.node.append(widget_code);
	      else
	        $('#field-'+id, self.node).replaceWith(widget_code);
	      if (self.options[id].required) {
	        $('#field-' + id, self.node).addClass('required');
	      }
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
	        /* XXX option defaults should not be applied here but until fields
	         * have a class of their own, this is a convenient place
	         */
	        self.options[id] = $.extend({required: false}, self.options[id]);
	        self.render_widget(id, value);
	      });
	      self.update_bindings();
	    },

	    update_bindings: function() {
	      var self = this;
	      self.model = ko.mapping.fromJS(self.data, self.mapping);
	      self.observe_model_changes();
	      ko.applyBindings(self.model, self.node.get(0));
	    },

	    field: function(id) {
	      var self = this;
	      return self.node.find('#field-' + id);
	    },

	    subscribe: function(id, real_id) {
	      /* Subscribe to changes on one field of the model and propagate them to
	       * the server.
	       */
	      var self = this;
	      if (!gocept.jsform.isUndefinedOrNull(self.subscriptions[id])) {
	          self.subscriptions[id].dispose();
	      }
	      self.subscriptions[id] = self.model[id].subscribe(function(newValue) {
	        self.save(gocept.jsform.or(real_id, id), newValue);
	      });
	    },

	    observe_model_changes: function() {
	      /* Observe changes on all fields on model. */
	      var self = this;
	      $.each(self.data, function (id, value) {
	        self.subscribe(id);
	      });
	    },

	    get_widget: function(id, value) {
	      /* Retrieve the widget for a field. */
	      var self = this;
	      if (gocept.jsform.isUndefinedOrNull(self.options[id]) ||
	          gocept.jsform.isUndefinedOrNull(self.options[id].template)) {
	        var type;
	        if (value === null) {
	          type = 'string';
	        } else {
	          type = typeof(value);
	        }
	        if (type == 'object' && self.options[id].multiple) {
	          type = 'multiselect';
	        }
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
	        self.status_message(self.t('successfully_saved_value'), 'success', 1000);
	      })
	      .progress(function() {
	        self.clear_saving(id, saving_msg_node);
	        self.notify_field_error(id, self.t('field_contains_unsaved_changes'));
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

	      var validated = $.Deferred();
	      var result = validated.promise();

	      if (self.options[id].required && !(newValue)) {
	        validated.reject(self.t('required_field_left_blank'));
	        return result;
	      }

	      self.data[id] = newValue;

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
	          $(self).trigger('unrecoverable-error',
	                          'Could not parse server response.');
	          return;
	        }
	        $(self).trigger('server-responded');
	      })
	      .fail(function(jqxhr, text_status, error_thrown) {
	        if (text_status == 'error' && error_thrown) {
	          $(self).trigger('unrecoverable-error', error_thrown);
	          return;
	        }
	        $(self).one('retry', function() {
	          self.start_save(id, newValue)
	            .done(validated.resolve)
	            .fail(validated.reject)
	            .progress(validated.notify);
	        });
	        validated.notify();
	        self.notify_server_error();
	      });

	      return result;
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
	      var error_node = self.node.find('.error');
	      error_node.text(msg);
	      self.highlight_field(id, 'danger');
	      error_node.data(
	          'status_message', self.status_message(id + ': ' + msg, 'danger'));
	    },

	    clear_field_error: function(id) {
	      var self = this;
	      var error_node = self.node.find('.error');
	      error_node.text('');
	      self.clear_status_message(error_node.data('status_message'));
	      error_node.data('status_message', null);
	    },

	    notify_server_error: function() {
	      /* Announce HTTP faults during ajax calls. */
	      var self = this;
	      self.clear_server_error();
	      self.server_error_status_message = self.status_message(
	          self.t('communication_error'), 'danger');
	    },

	    clear_server_error: function() {
	      /* Clear any announcement of an HTTP fault during an ajax call. */
	      var self = this;
	      self.clear_status_message(self.server_error_status_message);
	      self.server_error_status_message = null;
	    },

	    notify_saving: function(id) {
	      var self = this;
	      self.field(id).addClass('alert-saving');
	      return self.status_message(self.t('saving') + ' ' + id, 'info');
	    },

	    clear_saving: function(id, msg_node) {
	      var self = this;
	      self.field(id).removeClass('alert-saving');
	      self.clear_status_message(msg_node);
	    },

	    highlight_field: function(id, status) {
	      var self = this;
	      var field = self.field(id);
	      field.addClass('alert-' + status);
	      field.delay(300);
	      field.queue(function() {
	        $(this).removeClass('alert-' + status).dequeue();
	      });
	    },

	    status_message: function(message, status, duration) {
	      var self = this;
	      var msg_node = $('<div class="alert"></div>').text(message);
	      msg_node.addClass('alert-' + status);
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
	  });


	  $.fn.jsform_submit_button = function(action) {
	    return this.each(function() {
	      $(this).on('click', function(event) {
	        var button = this;
	        button.disabled = true;
	        var jsform = $(this).closest('form').data('form');
	        jsform.save_remaining();
	        jsform.when_saved().done(
	          function () {
	            action.call(button);
	        }).fail(
	          function (reason) {
	            var msg = 'Some fields could not be saved. ' +
	                'Please correct the errors and send again.';
	            jsform.status_message(msg, 'danger', 5000);
	            button.disabled = false;
	          }
	        );
	        event.preventDefault();
	      });
	    });
	  };

	}(jQuery));


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/// Knockout Mapping plugin v2.4.1
	/// (c) 2013 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
	/// License: MIT (http://www.opensource.org/licenses/mit-license.php)
	(function (factory) {
	    // Module systems magic dance.

	    if (true) {
	        // CommonJS or Node: hard-coded dependency on "knockout"
	        factory(__webpack_require__(11), exports);
	    } else if (typeof define === "function" && define["amd"]) {
	        // AMD anonymous module with hard-coded dependency on "knockout"
	        define(["knockout", "exports"], factory);
	    } else {
	        // <script> tag: use the global `ko` object, attaching a `mapping` property
	        factory(ko, ko.mapping = {});
	    }
	}(function (ko, exports) {
	    var DEBUG=true;
	    var mappingProperty = "__ko_mapping__";
	    var realKoDependentObservable = ko.dependentObservable;
	    var mappingNesting = 0;
	    var dependentObservables;
	    var visitedObjects;
	    var recognizedRootProperties = ["create", "update", "key", "arrayChanged"];
	    var emptyReturn = {};

	    var _defaultOptions = {
	        include: ["_destroy"],
	        ignore: [],
	        copy: [],
	        observe: []
	    };
	    var defaultOptions = _defaultOptions;

	    // Author: KennyTM @ StackOverflow
	    function unionArrays (x, y) {
	        var obj = {};
	        for (var i = x.length - 1; i >= 0; -- i) obj[x[i]] = x[i];
	        for (var i = y.length - 1; i >= 0; -- i) obj[y[i]] = y[i];
	        var res = [];

	        for (var k in obj) {
	            res.push(obj[k]);
	        };

	        return res;
	    }

	    function extendObject(destination, source) {
	        var destType;

	        for (var key in source) {
	            if (source.hasOwnProperty(key) && source[key]) {
	                destType = exports.getType(destination[key]);
	                if (key && destination[key] && destType !== "array" && destType !== "string") {
	                    extendObject(destination[key], source[key]);
	                } else {
	                    var bothArrays = exports.getType(destination[key]) === "array" && exports.getType(source[key]) === "array";
	                    if (bothArrays) {
	                        destination[key] = unionArrays(destination[key], source[key]);
	                    } else {
	                        destination[key] = source[key];
	                    }
	                }
	            }
	        }
	    }

	    function merge(obj1, obj2) {
	        var merged = {};
	        extendObject(merged, obj1);
	        extendObject(merged, obj2);

	        return merged;
	    }

	    exports.isMapped = function (viewModel) {
	        var unwrapped = ko.utils.unwrapObservable(viewModel);
	        return unwrapped && unwrapped[mappingProperty];
	    }

	    exports.fromJS = function (jsObject /*, inputOptions, target*/ ) {
	        if (arguments.length == 0) throw new Error("When calling ko.fromJS, pass the object you want to convert.");

	        try {
	            if (!mappingNesting++) {
	                dependentObservables = [];
	                visitedObjects = new objectLookup();
	            }

	            var options;
	            var target;

	            if (arguments.length == 2) {
	                if (arguments[1][mappingProperty]) {
	                    target = arguments[1];
	                } else {
	                    options = arguments[1];
	                }
	            }
	            if (arguments.length == 3) {
	                options = arguments[1];
	                target = arguments[2];
	            }

	            if (target) {
	                options = merge(options, target[mappingProperty]);
	            }
	            options = fillOptions(options);

	            var result = updateViewModel(target, jsObject, options);
	            if (target) {
	                result = target;
	            }

	            // Evaluate any dependent observables that were proxied.
	            // Do this after the model's observables have been created
	            if (!--mappingNesting) {
	                while (dependentObservables.length) {
	                    var DO = dependentObservables.pop();
	                    if (DO) {
	                        DO();
	                        
	                        // Move this magic property to the underlying dependent observable
	                        DO.__DO["throttleEvaluation"] = DO["throttleEvaluation"];
	                    }
	                }
	            }

	            // Save any new mapping options in the view model, so that updateFromJS can use them later.
	            result[mappingProperty] = merge(result[mappingProperty], options);

	            return result;
	        } catch(e) {
	            mappingNesting = 0;
	            throw e;
	        }
	    };

	    exports.fromJSON = function (jsonString /*, options, target*/ ) {
	        var parsed = ko.utils.parseJson(jsonString);
	        arguments[0] = parsed;
	        return exports.fromJS.apply(this, arguments);
	    };

	    exports.updateFromJS = function (viewModel) {
	        throw new Error("ko.mapping.updateFromJS, use ko.mapping.fromJS instead. Please note that the order of parameters is different!");
	    };

	    exports.updateFromJSON = function (viewModel) {
	        throw new Error("ko.mapping.updateFromJSON, use ko.mapping.fromJSON instead. Please note that the order of parameters is different!");
	    };

	    exports.toJS = function (rootObject, options) {
	        if (!defaultOptions) exports.resetDefaultOptions();

	        if (arguments.length == 0) throw new Error("When calling ko.mapping.toJS, pass the object you want to convert.");
	        if (exports.getType(defaultOptions.ignore) !== "array") throw new Error("ko.mapping.defaultOptions().ignore should be an array.");
	        if (exports.getType(defaultOptions.include) !== "array") throw new Error("ko.mapping.defaultOptions().include should be an array.");
	        if (exports.getType(defaultOptions.copy) !== "array") throw new Error("ko.mapping.defaultOptions().copy should be an array.");

	        // Merge in the options used in fromJS
	        options = fillOptions(options, rootObject[mappingProperty]);

	        // We just unwrap everything at every level in the object graph
	        return exports.visitModel(rootObject, function (x) {
	            return ko.utils.unwrapObservable(x)
	        }, options);
	    };

	    exports.toJSON = function (rootObject, options) {
	        var plainJavaScriptObject = exports.toJS(rootObject, options);
	        return ko.utils.stringifyJson(plainJavaScriptObject);
	    };

	    exports.defaultOptions = function () {
	        if (arguments.length > 0) {
	            defaultOptions = arguments[0];
	        } else {
	            return defaultOptions;
	        }
	    };

	    exports.resetDefaultOptions = function () {
	        defaultOptions = {
	            include: _defaultOptions.include.slice(0),
	            ignore: _defaultOptions.ignore.slice(0),
	            copy: _defaultOptions.copy.slice(0)
	        };
	    };

	    exports.getType = function(x) {
	        if ((x) && (typeof (x) === "object")) {
	            if (x.constructor === Date) return "date";
	            if (x.constructor === Array) return "array";
	        }
	        return typeof x;
	    }

	    function fillOptions(rawOptions, otherOptions) {
	        var options = merge({}, rawOptions);

	        // Move recognized root-level properties into a root namespace
	        for (var i = recognizedRootProperties.length - 1; i >= 0; i--) {
	            var property = recognizedRootProperties[i];
	            
	            // Carry on, unless this property is present
	            if (!options[property]) continue;
	            
	            // Move the property into the root namespace
	            if (!(options[""] instanceof Object)) options[""] = {};
	            options[""][property] = options[property];
	            delete options[property];
	        }

	        if (otherOptions) {
	            options.ignore = mergeArrays(otherOptions.ignore, options.ignore);
	            options.include = mergeArrays(otherOptions.include, options.include);
	            options.copy = mergeArrays(otherOptions.copy, options.copy);
	            options.observe = mergeArrays(otherOptions.observe, options.observe);
	        }
	        options.ignore = mergeArrays(options.ignore, defaultOptions.ignore);
	        options.include = mergeArrays(options.include, defaultOptions.include);
	        options.copy = mergeArrays(options.copy, defaultOptions.copy);
	        options.observe = mergeArrays(options.observe, defaultOptions.observe);

	        options.mappedProperties = options.mappedProperties || {};
	        options.copiedProperties = options.copiedProperties || {};
	        return options;
	    }

	    function mergeArrays(a, b) {
	        if (exports.getType(a) !== "array") {
	            if (exports.getType(a) === "undefined") a = [];
	            else a = [a];
	        }
	        if (exports.getType(b) !== "array") {
	            if (exports.getType(b) === "undefined") b = [];
	            else b = [b];
	        }

	        return ko.utils.arrayGetDistinctValues(a.concat(b));
	    }

	    // When using a 'create' callback, we proxy the dependent observable so that it doesn't immediately evaluate on creation.
	    // The reason is that the dependent observables in the user-specified callback may contain references to properties that have not been mapped yet.
	    function withProxyDependentObservable(dependentObservables, callback) {
	        var localDO = ko.dependentObservable;
	        ko.dependentObservable = function (read, owner, options) {
	            options = options || {};

	            if (read && typeof read == "object") { // mirrors condition in knockout implementation of DO's
	                options = read;
	            }

	            var realDeferEvaluation = options.deferEvaluation;

	            var isRemoved = false;

	            // We wrap the original dependent observable so that we can remove it from the 'dependentObservables' list we need to evaluate after mapping has
	            // completed if the user already evaluated the DO themselves in the meantime.
	            var wrap = function (DO) {
	                // Temporarily revert ko.dependentObservable, since it is used in ko.isWriteableObservable
	                var tmp = ko.dependentObservable;
	                ko.dependentObservable = realKoDependentObservable;
	                var isWriteable = ko.isWriteableObservable(DO);
	                ko.dependentObservable = tmp;

	                var wrapped = realKoDependentObservable({
	                    read: function () {
	                        if (!isRemoved) {
	                            ko.utils.arrayRemoveItem(dependentObservables, DO);
	                            isRemoved = true;
	                        }
	                        return DO.apply(DO, arguments);
	                    },
	                    write: isWriteable && function (val) {
	                        return DO(val);
	                    },
	                    deferEvaluation: true
	                });
	                if (DEBUG) wrapped._wrapper = true;
	                wrapped.__DO = DO;
	                return wrapped;
	            };
	            
	            options.deferEvaluation = true; // will either set for just options, or both read/options.
	            var realDependentObservable = new realKoDependentObservable(read, owner, options);

	            if (!realDeferEvaluation) {
	                realDependentObservable = wrap(realDependentObservable);
	                dependentObservables.push(realDependentObservable);
	            }

	            return realDependentObservable;
	        }
	        ko.dependentObservable.fn = realKoDependentObservable.fn;
	        ko.computed = ko.dependentObservable;
	        var result = callback();
	        ko.dependentObservable = localDO;
	        ko.computed = ko.dependentObservable;
	        return result;
	    }

	    function updateViewModel(mappedRootObject, rootObject, options, parentName, parent, parentPropertyName, mappedParent) {
	        var isArray = exports.getType(ko.utils.unwrapObservable(rootObject)) === "array";

	        parentPropertyName = parentPropertyName || "";

	        // If this object was already mapped previously, take the options from there and merge them with our existing ones.
	        if (exports.isMapped(mappedRootObject)) {
	            var previousMapping = ko.utils.unwrapObservable(mappedRootObject)[mappingProperty];
	            options = merge(previousMapping, options);
	        }

	        var callbackParams = {
	            data: rootObject,
	            parent: mappedParent || parent
	        };

	        var hasCreateCallback = function () {
	            return options[parentName] && options[parentName].create instanceof Function;
	        };

	        var createCallback = function (data) {
	            return withProxyDependentObservable(dependentObservables, function () {
	                
	                if (ko.utils.unwrapObservable(parent) instanceof Array) {
	                    return options[parentName].create({
	                        data: data || callbackParams.data,
	                        parent: callbackParams.parent,
	                        skip: emptyReturn
	                    });
	                } else {
	                    return options[parentName].create({
	                        data: data || callbackParams.data,
	                        parent: callbackParams.parent
	                    });
	                }               
	            });
	        };

	        var hasUpdateCallback = function () {
	            return options[parentName] && options[parentName].update instanceof Function;
	        };

	        var updateCallback = function (obj, data) {
	            var params = {
	                data: data || callbackParams.data,
	                parent: callbackParams.parent,
	                target: ko.utils.unwrapObservable(obj)
	            };

	            if (ko.isWriteableObservable(obj)) {
	                params.observable = obj;
	            }

	            return options[parentName].update(params);
	        }

	        var alreadyMapped = visitedObjects.get(rootObject);
	        if (alreadyMapped) {
	            return alreadyMapped;
	        }

	        parentName = parentName || "";

	        if (!isArray) {
	            // For atomic types, do a direct update on the observable
	            if (!canHaveProperties(rootObject)) {
	                switch (exports.getType(rootObject)) {
	                case "function":
	                    if (hasUpdateCallback()) {
	                        if (ko.isWriteableObservable(rootObject)) {
	                            rootObject(updateCallback(rootObject));
	                            mappedRootObject = rootObject;
	                        } else {
	                            mappedRootObject = updateCallback(rootObject);
	                        }
	                    } else {
	                        mappedRootObject = rootObject;
	                    }
	                    break;
	                default:
	                    if (ko.isWriteableObservable(mappedRootObject)) {
	                        if (hasUpdateCallback()) {
	                            var valueToWrite = updateCallback(mappedRootObject);
	                            mappedRootObject(valueToWrite);
	                            return valueToWrite;
	                        } else {
	                            var valueToWrite = ko.utils.unwrapObservable(rootObject);
	                            mappedRootObject(valueToWrite);
	                            return valueToWrite;
	                        }
	                    } else {
	                        var hasCreateOrUpdateCallback = hasCreateCallback() || hasUpdateCallback();
	                        
	                        if (hasCreateCallback()) {
	                            mappedRootObject = createCallback();
	                        } else {
	                            mappedRootObject = ko.observable(ko.utils.unwrapObservable(rootObject));
	                        }

	                        if (hasUpdateCallback()) {
	                            mappedRootObject(updateCallback(mappedRootObject));
	                        }
	                        
	                        if (hasCreateOrUpdateCallback) return mappedRootObject;
	                    }
	                }

	            } else {
	                mappedRootObject = ko.utils.unwrapObservable(mappedRootObject);
	                if (!mappedRootObject) {
	                    if (hasCreateCallback()) {
	                        var result = createCallback();

	                        if (hasUpdateCallback()) {
	                            result = updateCallback(result);
	                        }

	                        return result;
	                    } else {
	                        if (hasUpdateCallback()) {
	                            return updateCallback(result);
	                        }

	                        mappedRootObject = {};
	                    }
	                }

	                if (hasUpdateCallback()) {
	                    mappedRootObject = updateCallback(mappedRootObject);
	                }

	                visitedObjects.save(rootObject, mappedRootObject);
	                if (hasUpdateCallback()) return mappedRootObject;

	                // For non-atomic types, visit all properties and update recursively
	                visitPropertiesOrArrayEntries(rootObject, function (indexer) {
	                    var fullPropertyName = parentPropertyName.length ? parentPropertyName + "." + indexer : indexer;

	                    if (ko.utils.arrayIndexOf(options.ignore, fullPropertyName) != -1) {
	                        return;
	                    }

	                    if (ko.utils.arrayIndexOf(options.copy, fullPropertyName) != -1) {
	                        mappedRootObject[indexer] = rootObject[indexer];
	                        return;
	                    }

	                    if(typeof rootObject[indexer] != "object" && typeof rootObject[indexer] != "array" && options.observe.length > 0 && ko.utils.arrayIndexOf(options.observe, fullPropertyName) == -1)
	                    {
	                        mappedRootObject[indexer] = rootObject[indexer];
	                        options.copiedProperties[fullPropertyName] = true;
	                        return;
	                    }
	                    
	                    // In case we are adding an already mapped property, fill it with the previously mapped property value to prevent recursion.
	                    // If this is a property that was generated by fromJS, we should use the options specified there
	                    var prevMappedProperty = visitedObjects.get(rootObject[indexer]);
	                    var retval = updateViewModel(mappedRootObject[indexer], rootObject[indexer], options, indexer, mappedRootObject, fullPropertyName, mappedRootObject);
	                    var value = prevMappedProperty || retval;
	                    
	                    if(options.observe.length > 0 && ko.utils.arrayIndexOf(options.observe, fullPropertyName) == -1)
	                    {
	                        mappedRootObject[indexer] = value();
	                        options.copiedProperties[fullPropertyName] = true;
	                        return;
	                    }
	                    
	                    if (ko.isWriteableObservable(mappedRootObject[indexer])) {
	                        value = ko.utils.unwrapObservable(value);
	                        if (mappedRootObject[indexer]() !== value) {
	                            mappedRootObject[indexer](value);
	                        }
	                    } else {
	                        value = mappedRootObject[indexer] === undefined ? value : ko.utils.unwrapObservable(value);
	                        mappedRootObject[indexer] = value;
	                    }

	                    options.mappedProperties[fullPropertyName] = true;
	                });
	            }
	        } else { //mappedRootObject is an array
	            var changes = [];

	            var hasKeyCallback = false;
	            var keyCallback = function (x) {
	                return x;
	            }
	            if (options[parentName] && options[parentName].key) {
	                keyCallback = options[parentName].key;
	                hasKeyCallback = true;
	            }

	            if (!ko.isObservable(mappedRootObject)) {
	                // When creating the new observable array, also add a bunch of utility functions that take the 'key' of the array items into account.
	                mappedRootObject = ko.observableArray([]);

	                mappedRootObject.mappedRemove = function (valueOrPredicate) {
	                    var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) {
	                            return value === keyCallback(valueOrPredicate);
	                        };
	                    return mappedRootObject.remove(function (item) {
	                        return predicate(keyCallback(item));
	                    });
	                }

	                mappedRootObject.mappedRemoveAll = function (arrayOfValues) {
	                    var arrayOfKeys = filterArrayByKey(arrayOfValues, keyCallback);
	                    return mappedRootObject.remove(function (item) {
	                        return ko.utils.arrayIndexOf(arrayOfKeys, keyCallback(item)) != -1;
	                    });
	                }

	                mappedRootObject.mappedDestroy = function (valueOrPredicate) {
	                    var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) {
	                            return value === keyCallback(valueOrPredicate);
	                        };
	                    return mappedRootObject.destroy(function (item) {
	                        return predicate(keyCallback(item));
	                    });
	                }

	                mappedRootObject.mappedDestroyAll = function (arrayOfValues) {
	                    var arrayOfKeys = filterArrayByKey(arrayOfValues, keyCallback);
	                    return mappedRootObject.destroy(function (item) {
	                        return ko.utils.arrayIndexOf(arrayOfKeys, keyCallback(item)) != -1;
	                    });
	                }

	                mappedRootObject.mappedIndexOf = function (item) {
	                    var keys = filterArrayByKey(mappedRootObject(), keyCallback);
	                    var key = keyCallback(item);
	                    return ko.utils.arrayIndexOf(keys, key);
	                }

	                mappedRootObject.mappedGet = function (item) {
	                    return mappedRootObject()[mappedRootObject.mappedIndexOf(item)];
	                }

	                mappedRootObject.mappedCreate = function (value) {
	                    if (mappedRootObject.mappedIndexOf(value) !== -1) {
	                        throw new Error("There already is an object with the key that you specified.");
	                    }

	                    var item = hasCreateCallback() ? createCallback(value) : value;
	                    if (hasUpdateCallback()) {
	                        var newValue = updateCallback(item, value);
	                        if (ko.isWriteableObservable(item)) {
	                            item(newValue);
	                        } else {
	                            item = newValue;
	                        }
	                    }
	                    mappedRootObject.push(item);
	                    return item;
	                }
	            }

	            var currentArrayKeys = filterArrayByKey(ko.utils.unwrapObservable(mappedRootObject), keyCallback).sort();
	            var newArrayKeys = filterArrayByKey(rootObject, keyCallback);
	            if (hasKeyCallback) newArrayKeys.sort();
	            var editScript = ko.utils.compareArrays(currentArrayKeys, newArrayKeys);

	            var ignoreIndexOf = {};
	            
	            var i, j;

	            var unwrappedRootObject = ko.utils.unwrapObservable(rootObject);
	            var itemsByKey = {};
	            var optimizedKeys = true;
	            for (i = 0, j = unwrappedRootObject.length; i < j; i++) {
	                var key = keyCallback(unwrappedRootObject[i]);
	                if (key === undefined || key instanceof Object) {
	                    optimizedKeys = false;
	                    break;
	                }
	                itemsByKey[key] = unwrappedRootObject[i];
	            }

	            var newContents = [];
	            var passedOver = 0;
	            for (i = 0, j = editScript.length; i < j; i++) {
	                var key = editScript[i];
	                var mappedItem;
	                var fullPropertyName = parentPropertyName + "[" + i + "]";
	                switch (key.status) {
	                case "added":
	                    var item = optimizedKeys ? itemsByKey[key.value] : getItemByKey(ko.utils.unwrapObservable(rootObject), key.value, keyCallback);
	                    mappedItem = updateViewModel(undefined, item, options, parentName, mappedRootObject, fullPropertyName, parent);
	                    if(!hasCreateCallback()) {
	                        mappedItem = ko.utils.unwrapObservable(mappedItem);
	                    }

	                    var index = ignorableIndexOf(ko.utils.unwrapObservable(rootObject), item, ignoreIndexOf);
	                    
	                    if (mappedItem === emptyReturn) {
	                        passedOver++;
	                    } else {
	                        newContents[index - passedOver] = mappedItem;
	                    }
	                        
	                    ignoreIndexOf[index] = true;
	                    break;
	                case "retained":
	                    var item = optimizedKeys ? itemsByKey[key.value] : getItemByKey(ko.utils.unwrapObservable(rootObject), key.value, keyCallback);
	                    mappedItem = getItemByKey(mappedRootObject, key.value, keyCallback);
	                    updateViewModel(mappedItem, item, options, parentName, mappedRootObject, fullPropertyName, parent);

	                    var index = ignorableIndexOf(ko.utils.unwrapObservable(rootObject), item, ignoreIndexOf);
	                    newContents[index] = mappedItem;
	                    ignoreIndexOf[index] = true;
	                    break;
	                case "deleted":
	                    mappedItem = getItemByKey(mappedRootObject, key.value, keyCallback);
	                    break;
	                }

	                changes.push({
	                    event: key.status,
	                    item: mappedItem
	                });
	            }

	            mappedRootObject(newContents);

	            if (options[parentName] && options[parentName].arrayChanged) {
	                ko.utils.arrayForEach(changes, function (change) {
	                    options[parentName].arrayChanged(change.event, change.item);
	                });
	            }
	        }

	        return mappedRootObject;
	    }

	    function ignorableIndexOf(array, item, ignoreIndices) {
	        for (var i = 0, j = array.length; i < j; i++) {
	            if (ignoreIndices[i] === true) continue;
	            if (array[i] === item) return i;
	        }
	        return null;
	    }

	    function mapKey(item, callback) {
	        var mappedItem;
	        if (callback) mappedItem = callback(item);
	        if (exports.getType(mappedItem) === "undefined") mappedItem = item;

	        return ko.utils.unwrapObservable(mappedItem);
	    }

	    function getItemByKey(array, key, callback) {
	        array = ko.utils.unwrapObservable(array);
	        for (var i = 0, j = array.length; i < j; i++) {
	            var item = array[i];
	            if (mapKey(item, callback) === key) return item;
	        }

	        throw new Error("When calling ko.update*, the key '" + key + "' was not found!");
	    }

	    function filterArrayByKey(array, callback) {
	        return ko.utils.arrayMap(ko.utils.unwrapObservable(array), function (item) {
	            if (callback) {
	                return mapKey(item, callback);
	            } else {
	                return item;
	            }
	        });
	    }

	    function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
	        if (exports.getType(rootObject) === "array") {
	            for (var i = 0; i < rootObject.length; i++)
	            visitorCallback(i);
	        } else {
	            for (var propertyName in rootObject)
	            visitorCallback(propertyName);
	        }
	    };

	    function canHaveProperties(object) {
	        var type = exports.getType(object);
	        return ((type === "object") || (type === "array")) && (object !== null);
	    }

	    // Based on the parentName, this creates a fully classified name of a property

	    function getPropertyName(parentName, parent, indexer) {
	        var propertyName = parentName || "";
	        if (exports.getType(parent) === "array") {
	            if (parentName) {
	                propertyName += "[" + indexer + "]";
	            }
	        } else {
	            if (parentName) {
	                propertyName += ".";
	            }
	            propertyName += indexer;
	        }
	        return propertyName;
	    }

	    exports.visitModel = function (rootObject, callback, options) {
	        options = options || {};
	        options.visitedObjects = options.visitedObjects || new objectLookup();

	        var mappedRootObject;
	        var unwrappedRootObject = ko.utils.unwrapObservable(rootObject);

	        if (!canHaveProperties(unwrappedRootObject)) {
	            return callback(rootObject, options.parentName);
	        } else {
	            options = fillOptions(options, unwrappedRootObject[mappingProperty]);

	            // Only do a callback, but ignore the results
	            callback(rootObject, options.parentName);
	            mappedRootObject = exports.getType(unwrappedRootObject) === "array" ? [] : {};
	        }

	        options.visitedObjects.save(rootObject, mappedRootObject);

	        var parentName = options.parentName;
	        visitPropertiesOrArrayEntries(unwrappedRootObject, function (indexer) {
	            if (options.ignore && ko.utils.arrayIndexOf(options.ignore, indexer) != -1) return;

	            var propertyValue = unwrappedRootObject[indexer];
	            options.parentName = getPropertyName(parentName, unwrappedRootObject, indexer);

	            // If we don't want to explicitly copy the unmapped property...
	            if (ko.utils.arrayIndexOf(options.copy, indexer) === -1) {
	                // ...find out if it's a property we want to explicitly include
	                if (ko.utils.arrayIndexOf(options.include, indexer) === -1) {
	                    // The mapped properties object contains all the properties that were part of the original object.
	                    // If a property does not exist, and it is not because it is part of an array (e.g. "myProp[3]"), then it should not be unmapped.
	                    if (unwrappedRootObject[mappingProperty]
	                        && unwrappedRootObject[mappingProperty].mappedProperties && !unwrappedRootObject[mappingProperty].mappedProperties[indexer]
	                        && unwrappedRootObject[mappingProperty].copiedProperties && !unwrappedRootObject[mappingProperty].copiedProperties[indexer]
	                        && !(exports.getType(unwrappedRootObject) === "array")) {
	                        return;
	                    }
	                }
	            }

	            var outputProperty;
	            switch (exports.getType(ko.utils.unwrapObservable(propertyValue))) {
	            case "object":
	            case "array":
	            case "undefined":
	                var previouslyMappedValue = options.visitedObjects.get(propertyValue);
	                mappedRootObject[indexer] = (exports.getType(previouslyMappedValue) !== "undefined") ? previouslyMappedValue : exports.visitModel(propertyValue, callback, options);
	                break;
	            default:
	                mappedRootObject[indexer] = callback(propertyValue, options.parentName);
	            }
	        });

	        return mappedRootObject;
	    }

	    function simpleObjectLookup() {
	        var keys = [];
	        var values = [];
	        this.save = function (key, value) {
	            var existingIndex = ko.utils.arrayIndexOf(keys, key);
	            if (existingIndex >= 0) values[existingIndex] = value;
	            else {
	                keys.push(key);
	                values.push(value);
	            }
	        };
	        this.get = function (key) {
	            var existingIndex = ko.utils.arrayIndexOf(keys, key);
	            var value = (existingIndex >= 0) ? values[existingIndex] : undefined;
	            return value;
	        };
	    };
	    
	    function objectLookup() {
	        var buckets = {};
	        
	        var findBucket = function(key) {
	            var bucketKey;
	            try {
	                bucketKey = key;//JSON.stringify(key);
	            }
	            catch (e) {
	                bucketKey = "$$$";
	            }

	            var bucket = buckets[bucketKey];
	            if (bucket === undefined) {
	                bucket = new simpleObjectLookup();
	                buckets[bucketKey] = bucket;
	            }
	            return bucket;
	        };
	        
	        this.save = function (key, value) {
	            findBucket(key).save(key, value);
	        };
	        this.get = function (key) {
	            return findBucket(key).get(key);
	        };
	    };
	}));


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	(function($) {

	  var isUndefinedOrNull = function(o) {
	    return typeof(o) == 'undefined' || o === null;
	  };

	  var declare_namespace = function(namespace) {
	    var obj = window;
	    $.each(namespace.split('.'), function(i, name) {
	      if (isUndefinedOrNull(obj[name])) {
	        obj[name] = {};
	      }
	      obj = obj[name];
	    });
	  };

	  declare_namespace('gocept.jsform');
	  gocept.jsform.declare_namespace = declare_namespace;
	  gocept.jsform.isUndefinedOrNull = isUndefinedOrNull;

	  gocept.jsform.or = function(value1, value2) {
	    if (!isUndefinedOrNull(value1)) {
	      return value1;
	    } else {
	      return value2;
	    }
	  };

	}(jQuery));



/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./gocept_jsform_templates_boolean.pt": 4,
		"./gocept_jsform_templates_field_wrapper.pt": 5,
		"./gocept_jsform_templates_form.pt": 6,
		"./gocept_jsform_templates_multiselect.pt": 7,
		"./gocept_jsform_templates_object.pt": 8,
		"./gocept_jsform_templates_string.pt": 9,
		"./gocept_jsform_templates_text.pt": 10
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<input type=\"checkbox\" name=\"{name}\" data-bind=\"checked: {name}\" />\n";

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<div class=\"field\" id=\"field-{id}\">\n    <label for=\"{name}\">{label}</label>\n    <div class=\"error\"></div>\n    {widget_code|raw}\n</div>\n";

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<form method=\"POST\" action=\"{action}\" id=\"{form_id}\" class=\"jsform\">\n<div class=\"statusarea\"></div>\n</form>\n";

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<select name=\"{name}\"\n        multiple\n        data-bind=\"selectedOptions: {name}\">\n<option></option>\n{. repeated section source}\n  <option value=\"{token}\">{title}</option>\n{.end}\n</select>\n";

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<select name=\"{name}\"\n        data-bind=\"value: {name}\">\n  <option></option>\n{. repeated section source}\n  <option value=\"{token}\">{title}</option>\n{.end}\n</select>\n";

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<input type=\"text\" data-bind=\"value: {name}\" name=\"{name}\" value=\"\" />\n";

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<textarea data-bind=\"value: {name}\" name=\"{name}\"></textarea>\n";

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module) {// Knockout JavaScript library v2.2.1
	// (c) Steven Sanderson - http://knockoutjs.com/
	// License: MIT (http://www.opensource.org/licenses/mit-license.php)

	(function(){
	var DEBUG=true;
	(function(undefined){
	    // (0, eval)('this') is a robust way of getting a reference to the global object
	    // For details, see http://stackoverflow.com/questions/14119988/return-this-0-evalthis/14120023#14120023
	    var window = this || (0, eval)('this'),
	        document = window['document'],
	        navigator = window['navigator'],
	        jQuery = window["jQuery"],
	        JSON = window["JSON"];
	!function(factory) {
	    // Support three module loading scenarios
	    if (true) {
	        // [1] CommonJS/Node.js
	        var target = module['exports'] || exports; // module.exports is for Node.js
	        factory(target);
	    } else if (typeof define === 'function' && define['amd']) {
	        // [2] AMD anonymous module
	        define(['exports'], factory);
	    } else {
	        // [3] No module loader (plain <script> tag) - put directly in global namespace
	        factory(window['ko'] = {});
	    }
	}(function(koExports){
	// Internally, all KO objects are attached to koExports (even the non-exported ones whose names will be minified by the closure compiler).
	// In the future, the following "ko" variable may be made distinct from "koExports" so that private objects are not externally reachable.
	var ko = typeof koExports !== 'undefined' ? koExports : {};
	// Google Closure Compiler helpers (used only to make the minified file smaller)
	ko.exportSymbol = function(koPath, object) {
		var tokens = koPath.split(".");

		// In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
		// At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
		var target = ko;

		for (var i = 0; i < tokens.length - 1; i++)
			target = target[tokens[i]];
		target[tokens[tokens.length - 1]] = object;
	};
	ko.exportProperty = function(owner, publicName, object) {
	  owner[publicName] = object;
	};
	ko.version = "2.2.1";

	ko.exportSymbol('version', ko.version);
	ko.utils = (function () {
	    var stringTrimRegex = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;

	    var objectForEach = function(obj, action) {
	        for (var prop in obj) {
	            if (obj.hasOwnProperty(prop)) {
	                action(prop, obj[prop]);
	            }
	        }
	    };

	    // Represent the known event types in a compact way, then at runtime transform it into a hash with event name as key (for fast lookup)
	    var knownEvents = {}, knownEventTypesByEventName = {};
	    var keyEventTypeName = (navigator && /Firefox\/2/i.test(navigator.userAgent)) ? 'KeyboardEvent' : 'UIEvents';
	    knownEvents[keyEventTypeName] = ['keyup', 'keydown', 'keypress'];
	    knownEvents['MouseEvents'] = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave'];
	    objectForEach(knownEvents, function(eventType, knownEventsForType) {
	        if (knownEventsForType.length) {
	            for (var i = 0, j = knownEventsForType.length; i < j; i++)
	                knownEventTypesByEventName[knownEventsForType[i]] = eventType;
	        }
	    });
	    var eventsThatMustBeRegisteredUsingAttachEvent = { 'propertychange': true }; // Workaround for an IE9 issue - https://github.com/SteveSanderson/knockout/issues/406

	    // Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness)
	    // Note that, since IE 10 does not support conditional comments, the following logic only detects IE < 10.
	    // Currently this is by design, since IE 10+ behaves correctly when treated as a standard browser.
	    // If there is a future need to detect specific versions of IE10+, we will amend this.
	    var ieVersion = document && (function() {
	        var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

	        // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
	        while (
	            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
	            iElems[0]
	        );
	        return version > 4 ? version : undefined;
	    }());
	    var isIe6 = ieVersion === 6,
	        isIe7 = ieVersion === 7;

	    function isClickOnCheckableElement(element, eventType) {
	        if ((ko.utils.tagNameLower(element) !== "input") || !element.type) return false;
	        if (eventType.toLowerCase() != "click") return false;
	        var inputType = element.type;
	        return (inputType == "checkbox") || (inputType == "radio");
	    }

	    return {
	        fieldsIncludedWithJsonPost: ['authenticity_token', /^__RequestVerificationToken(_.*)?$/],

	        arrayForEach: function (array, action) {
	            for (var i = 0, j = array.length; i < j; i++)
	                action(array[i]);
	        },

	        arrayIndexOf: function (array, item) {
	            if (typeof Array.prototype.indexOf == "function")
	                return Array.prototype.indexOf.call(array, item);
	            for (var i = 0, j = array.length; i < j; i++)
	                if (array[i] === item)
	                    return i;
	            return -1;
	        },

	        arrayFirst: function (array, predicate, predicateOwner) {
	            for (var i = 0, j = array.length; i < j; i++)
	                if (predicate.call(predicateOwner, array[i]))
	                    return array[i];
	            return null;
	        },

	        arrayRemoveItem: function (array, itemToRemove) {
	            var index = ko.utils.arrayIndexOf(array, itemToRemove);
	            if (index >= 0)
	                array.splice(index, 1);
	        },

	        arrayGetDistinctValues: function (array) {
	            array = array || [];
	            var result = [];
	            for (var i = 0, j = array.length; i < j; i++) {
	                if (ko.utils.arrayIndexOf(result, array[i]) < 0)
	                    result.push(array[i]);
	            }
	            return result;
	        },

	        arrayMap: function (array, mapping) {
	            array = array || [];
	            var result = [];
	            for (var i = 0, j = array.length; i < j; i++)
	                result.push(mapping(array[i]));
	            return result;
	        },

	        arrayFilter: function (array, predicate) {
	            array = array || [];
	            var result = [];
	            for (var i = 0, j = array.length; i < j; i++)
	                if (predicate(array[i]))
	                    result.push(array[i]);
	            return result;
	        },

	        arrayPushAll: function (array, valuesToPush) {
	            if (valuesToPush instanceof Array)
	                array.push.apply(array, valuesToPush);
	            else
	                for (var i = 0, j = valuesToPush.length; i < j; i++)
	                    array.push(valuesToPush[i]);
	            return array;
	        },

	        addOrRemoveItem: function(array, value, included) {
	            var existingEntryIndex = array.indexOf ? array.indexOf(value) : utils.arrayIndexOf(array, value);
	            if (existingEntryIndex < 0) {
	                if (included)
	                    array.push(value);
	            } else {
	                if (!included)
	                    array.splice(existingEntryIndex, 1);
	            }
	        },

	        extend: function (target, source) {
	            if (source) {
	                for(var prop in source) {
	                    if(source.hasOwnProperty(prop)) {
	                        target[prop] = source[prop];
	                    }
	                }
	            }
	            return target;
	        },

	        objectForEach: objectForEach,

	        emptyDomNode: function (domNode) {
	            while (domNode.firstChild) {
	                ko.removeNode(domNode.firstChild);
	            }
	        },

	        moveCleanedNodesToContainerElement: function(nodes) {
	            // Ensure it's a real array, as we're about to reparent the nodes and
	            // we don't want the underlying collection to change while we're doing that.
	            var nodesArray = ko.utils.makeArray(nodes);

	            var container = document.createElement('div');
	            for (var i = 0, j = nodesArray.length; i < j; i++) {
	                container.appendChild(ko.cleanNode(nodesArray[i]));
	            }
	            return container;
	        },

	        cloneNodes: function (nodesArray, shouldCleanNodes) {
	            for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
	                var clonedNode = nodesArray[i].cloneNode(true);
	                newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
	            }
	            return newNodesArray;
	        },

	        setDomNodeChildren: function (domNode, childNodes) {
	            ko.utils.emptyDomNode(domNode);
	            if (childNodes) {
	                for (var i = 0, j = childNodes.length; i < j; i++)
	                    domNode.appendChild(childNodes[i]);
	            }
	        },

	        replaceDomNodes: function (nodeToReplaceOrNodeArray, newNodesArray) {
	            var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
	            if (nodesToReplaceArray.length > 0) {
	                var insertionPoint = nodesToReplaceArray[0];
	                var parent = insertionPoint.parentNode;
	                for (var i = 0, j = newNodesArray.length; i < j; i++)
	                    parent.insertBefore(newNodesArray[i], insertionPoint);
	                for (var i = 0, j = nodesToReplaceArray.length; i < j; i++) {
	                    ko.removeNode(nodesToReplaceArray[i]);
	                }
	            }
	        },

	        setOptionNodeSelectionState: function (optionNode, isSelected) {
	            // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
	            if (ieVersion < 7)
	                optionNode.setAttribute("selected", isSelected);
	            else
	                optionNode.selected = isSelected;
	        },

	        stringTrim: function (string) {
	            return (string || "").replace(stringTrimRegex, "");
	        },

	        stringTokenize: function (string, delimiter) {
	            var result = [];
	            var tokens = (string || "").split(delimiter);
	            for (var i = 0, j = tokens.length; i < j; i++) {
	                var trimmed = ko.utils.stringTrim(tokens[i]);
	                if (trimmed !== "")
	                    result.push(trimmed);
	            }
	            return result;
	        },

	        stringStartsWith: function (string, startsWith) {
	            string = string || "";
	            if (startsWith.length > string.length)
	                return false;
	            return string.substring(0, startsWith.length) === startsWith;
	        },

	        domNodeIsContainedBy: function (node, containedByNode) {
	            if (containedByNode.compareDocumentPosition)
	                return (containedByNode.compareDocumentPosition(node) & 16) == 16;
	            while (node != null) {
	                if (node == containedByNode)
	                    return true;
	                node = node.parentNode;
	            }
	            return false;
	        },

	        domNodeIsAttachedToDocument: function (node) {
	            return ko.utils.domNodeIsContainedBy(node, node.ownerDocument);
	        },

	        anyDomNodeIsAttachedToDocument: function(nodes) {
	            return !!ko.utils.arrayFirst(nodes, ko.utils.domNodeIsAttachedToDocument);
	        },

	        tagNameLower: function(element) {
	            // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
	            // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
	            // we don't need to do the .toLowerCase() as it will always be lower case anyway.
	            return element && element.tagName && element.tagName.toLowerCase();
	        },

	        registerEventHandler: function (element, eventType, handler) {
	            var mustUseAttachEvent = ieVersion && eventsThatMustBeRegisteredUsingAttachEvent[eventType];
	            if (!mustUseAttachEvent && typeof jQuery != "undefined") {
	                if (isClickOnCheckableElement(element, eventType)) {
	                    // For click events on checkboxes, jQuery interferes with the event handling in an awkward way:
	                    // it toggles the element checked state *after* the click event handlers run, whereas native
	                    // click events toggle the checked state *before* the event handler.
	                    // Fix this by intecepting the handler and applying the correct checkedness before it runs.
	                    var originalHandler = handler;
	                    handler = function(event, eventData) {
	                        var jQuerySuppliedCheckedState = this.checked;
	                        if (eventData)
	                            this.checked = eventData.checkedStateBeforeEvent !== true;
	                        originalHandler.call(this, event);
	                        this.checked = jQuerySuppliedCheckedState; // Restore the state jQuery applied
	                    };
	                }
	                jQuery(element)['bind'](eventType, handler);
	            } else if (!mustUseAttachEvent && typeof element.addEventListener == "function")
	                element.addEventListener(eventType, handler, false);
	            else if (typeof element.attachEvent != "undefined")
	                element.attachEvent("on" + eventType, function (event) {
	                    handler.call(element, event);
	                });
	            else
	                throw new Error("Browser doesn't support addEventListener or attachEvent");
	        },

	        triggerEvent: function (element, eventType) {
	            if (!(element && element.nodeType))
	                throw new Error("element must be a DOM node when calling triggerEvent");

	            if (typeof jQuery != "undefined") {
	                var eventData = [];
	                if (isClickOnCheckableElement(element, eventType)) {
	                    // Work around the jQuery "click events on checkboxes" issue described above by storing the original checked state before triggering the handler
	                    eventData.push({ checkedStateBeforeEvent: element.checked });
	                }
	                jQuery(element)['trigger'](eventType, eventData);
	            } else if (typeof document.createEvent == "function") {
	                if (typeof element.dispatchEvent == "function") {
	                    var eventCategory = knownEventTypesByEventName[eventType] || "HTMLEvents";
	                    var event = document.createEvent(eventCategory);
	                    event.initEvent(eventType, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, element);
	                    element.dispatchEvent(event);
	                }
	                else
	                    throw new Error("The supplied element doesn't support dispatchEvent");
	            } else if (typeof element.fireEvent != "undefined") {
	                // Unlike other browsers, IE doesn't change the checked state of checkboxes/radiobuttons when you trigger their "click" event
	                // so to make it consistent, we'll do it manually here
	                if (isClickOnCheckableElement(element, eventType))
	                    element.checked = element.checked !== true;
	                element.fireEvent("on" + eventType);
	            }
	            else
	                throw new Error("Browser doesn't support triggering events");
	        },

	        unwrapObservable: function (value) {
	            return ko.isObservable(value) ? value() : value;
	        },

	        peekObservable: function (value) {
	            return ko.isObservable(value) ? value.peek() : value;
	        },

	        toggleDomNodeCssClass: function (node, classNames, shouldHaveClass) {
	            if (classNames) {
	                var cssClassNameRegex = /\S+/g,
	                    currentClassNames = node.className.match(cssClassNameRegex) || [];
	                ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
	                    ko.utils.addOrRemoveItem(currentClassNames, className, shouldHaveClass);
	                });
	                node.className = currentClassNames.join(" ");
	            }
	        },

	        setTextContent: function(element, textContent) {
	            var value = ko.utils.unwrapObservable(textContent);
	            if ((value === null) || (value === undefined))
	                value = "";

	            if (element.nodeType === 3) {
	                element.data = value;
	            } else {
	                // We need there to be exactly one child: a text node.
	                // If there are no children, more than one, or if it's not a text node,
	                // we'll clear everything and create a single text node.
	                var innerTextNode = ko.virtualElements.firstChild(element);
	                if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
	                    ko.virtualElements.setDomNodeChildren(element, [document.createTextNode(value)]);
	                } else {
	                    innerTextNode.data = value;
	                }

	                ko.utils.forceRefresh(element);
	            }
	        },

	        setElementName: function(element, name) {
	            element.name = name;

	            // Workaround IE 6/7 issue
	            // - https://github.com/SteveSanderson/knockout/issues/197
	            // - http://www.matts411.com/post/setting_the_name_attribute_in_ie_dom/
	            if (ieVersion <= 7) {
	                try {
	                    element.mergeAttributes(document.createElement("<input name='" + element.name + "'/>"), false);
	                }
	                catch(e) {} // For IE9 with doc mode "IE9 Standards" and browser mode "IE9 Compatibility View"
	            }
	        },

	        forceRefresh: function(node) {
	            // Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209
	            if (ieVersion >= 9) {
	                // For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
	                var elem = node.nodeType == 1 ? node : node.parentNode;
	                if (elem.style)
	                    elem.style.zoom = elem.style.zoom;
	            }
	        },

	        ensureSelectElementIsRenderedCorrectly: function(selectElement) {
	            // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
	            // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
	            if (ieVersion >= 9) {
	                var originalWidth = selectElement.style.width;
	                selectElement.style.width = 0;
	                selectElement.style.width = originalWidth;
	            }
	        },

	        range: function (min, max) {
	            min = ko.utils.unwrapObservable(min);
	            max = ko.utils.unwrapObservable(max);
	            var result = [];
	            for (var i = min; i <= max; i++)
	                result.push(i);
	            return result;
	        },

	        makeArray: function(arrayLikeObject) {
	            var result = [];
	            for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
	                result.push(arrayLikeObject[i]);
	            };
	            return result;
	        },

	        isIe6 : isIe6,
	        isIe7 : isIe7,
	        ieVersion : ieVersion,

	        getFormFields: function(form, fieldName) {
	            var fields = ko.utils.makeArray(form.getElementsByTagName("input")).concat(ko.utils.makeArray(form.getElementsByTagName("textarea")));
	            var isMatchingField = (typeof fieldName == 'string')
	                ? function(field) { return field.name === fieldName }
	                : function(field) { return fieldName.test(field.name) }; // Treat fieldName as regex or object containing predicate
	            var matches = [];
	            for (var i = fields.length - 1; i >= 0; i--) {
	                if (isMatchingField(fields[i]))
	                    matches.push(fields[i]);
	            };
	            return matches;
	        },

	        parseJson: function (jsonString) {
	            if (typeof jsonString == "string") {
	                jsonString = ko.utils.stringTrim(jsonString);
	                if (jsonString) {
	                    if (JSON && JSON.parse) // Use native parsing where available
	                        return JSON.parse(jsonString);
	                    return (new Function("return " + jsonString))(); // Fallback on less safe parsing for older browsers
	                }
	            }
	            return null;
	        },

	        stringifyJson: function (data, replacer, space) {   // replacer and space are optional
	            if (!JSON || !JSON.stringify)
	                throw new Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");
	            return JSON.stringify(ko.utils.unwrapObservable(data), replacer, space);
	        },

	        postJson: function (urlOrForm, data, options) {
	            options = options || {};
	            var params = options['params'] || {};
	            var includeFields = options['includeFields'] || this.fieldsIncludedWithJsonPost;
	            var url = urlOrForm;

	            // If we were given a form, use its 'action' URL and pick out any requested field values
	            if((typeof urlOrForm == 'object') && (ko.utils.tagNameLower(urlOrForm) === "form")) {
	                var originalForm = urlOrForm;
	                url = originalForm.action;
	                for (var i = includeFields.length - 1; i >= 0; i--) {
	                    var fields = ko.utils.getFormFields(originalForm, includeFields[i]);
	                    for (var j = fields.length - 1; j >= 0; j--)
	                        params[fields[j].name] = fields[j].value;
	                }
	            }

	            data = ko.utils.unwrapObservable(data);
	            var form = document.createElement("form");
	            form.style.display = "none";
	            form.action = url;
	            form.method = "post";
	            for (var key in data) {
	                // Since 'data' this is a model object, we include all properties including those inherited from its prototype
	                var input = document.createElement("input");
	                input.name = key;
	                input.value = ko.utils.stringifyJson(ko.utils.unwrapObservable(data[key]));
	                form.appendChild(input);
	            }
	            objectForEach(params, function(key, value) {
	                var input = document.createElement("input");
	                input.name = key;
	                input.value = value;
	                form.appendChild(input);
	            });
	            document.body.appendChild(form);
	            options['submitter'] ? options['submitter'](form) : form.submit();
	            setTimeout(function () { form.parentNode.removeChild(form); }, 0);
	        }
	    }
	}());

	ko.exportSymbol('utils', ko.utils);
	ko.exportSymbol('utils.arrayForEach', ko.utils.arrayForEach);
	ko.exportSymbol('utils.arrayFirst', ko.utils.arrayFirst);
	ko.exportSymbol('utils.arrayFilter', ko.utils.arrayFilter);
	ko.exportSymbol('utils.arrayGetDistinctValues', ko.utils.arrayGetDistinctValues);
	ko.exportSymbol('utils.arrayIndexOf', ko.utils.arrayIndexOf);
	ko.exportSymbol('utils.arrayMap', ko.utils.arrayMap);
	ko.exportSymbol('utils.arrayPushAll', ko.utils.arrayPushAll);
	ko.exportSymbol('utils.arrayRemoveItem', ko.utils.arrayRemoveItem);
	ko.exportSymbol('utils.extend', ko.utils.extend);
	ko.exportSymbol('utils.fieldsIncludedWithJsonPost', ko.utils.fieldsIncludedWithJsonPost);
	ko.exportSymbol('utils.getFormFields', ko.utils.getFormFields);
	ko.exportSymbol('utils.peekObservable', ko.utils.peekObservable);
	ko.exportSymbol('utils.postJson', ko.utils.postJson);
	ko.exportSymbol('utils.parseJson', ko.utils.parseJson);
	ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
	ko.exportSymbol('utils.stringifyJson', ko.utils.stringifyJson);
	ko.exportSymbol('utils.range', ko.utils.range);
	ko.exportSymbol('utils.toggleDomNodeCssClass', ko.utils.toggleDomNodeCssClass);
	ko.exportSymbol('utils.triggerEvent', ko.utils.triggerEvent);
	ko.exportSymbol('utils.unwrapObservable', ko.utils.unwrapObservable);

	if (!Function.prototype['bind']) {
	    // Function.prototype.bind is a standard part of ECMAScript 5th Edition (December 2009, http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf)
	    // In case the browser doesn't implement it natively, provide a JavaScript implementation. This implementation is based on the one in prototype.js
	    Function.prototype['bind'] = function (object) {
	        var originalFunction = this, args = Array.prototype.slice.call(arguments), object = args.shift();
	        return function () {
	            return originalFunction.apply(object, args.concat(Array.prototype.slice.call(arguments)));
	        };
	    };
	}

	ko.utils.domData = new (function () {
	    var uniqueId = 0;
	    var dataStoreKeyExpandoPropertyName = "__ko__" + (new Date).getTime();
	    var dataStore = {};
	    return {
	        get: function (node, key) {
	            var allDataForNode = ko.utils.domData.getAll(node, false);
	            return allDataForNode === undefined ? undefined : allDataForNode[key];
	        },
	        set: function (node, key, value) {
	            if (value === undefined) {
	                // Make sure we don't actually create a new domData key if we are actually deleting a value
	                if (ko.utils.domData.getAll(node, false) === undefined)
	                    return;
	            }
	            var allDataForNode = ko.utils.domData.getAll(node, true);
	            allDataForNode[key] = value;
	        },
	        getAll: function (node, createIfNotFound) {
	            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
	            var hasExistingDataStore = dataStoreKey && (dataStoreKey !== "null") && dataStore[dataStoreKey];
	            if (!hasExistingDataStore) {
	                if (!createIfNotFound)
	                    return undefined;
	                dataStoreKey = node[dataStoreKeyExpandoPropertyName] = "ko" + uniqueId++;
	                dataStore[dataStoreKey] = {};
	            }
	            return dataStore[dataStoreKey];
	        },
	        clear: function (node) {
	            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
	            if (dataStoreKey) {
	                delete dataStore[dataStoreKey];
	                node[dataStoreKeyExpandoPropertyName] = null;
	                return true; // Exposing "did clean" flag purely so specs can infer whether things have been cleaned up as intended
	            }
	            return false;
	        }
	    }
	})();

	ko.exportSymbol('utils.domData', ko.utils.domData);
	ko.exportSymbol('utils.domData.clear', ko.utils.domData.clear); // Exporting only so specs can clear up after themselves fully

	ko.utils.domNodeDisposal = new (function () {
	    var domDataKey = "__ko_domNodeDisposal__" + (new Date).getTime();
	    var cleanableNodeTypes = { 1: true, 8: true, 9: true };       // Element, Comment, Document
	    var cleanableNodeTypesWithDescendants = { 1: true, 9: true }; // Element, Document

	    function getDisposeCallbacksCollection(node, createIfNotFound) {
	        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
	        if ((allDisposeCallbacks === undefined) && createIfNotFound) {
	            allDisposeCallbacks = [];
	            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
	        }
	        return allDisposeCallbacks;
	    }
	    function destroyCallbacksCollection(node) {
	        ko.utils.domData.set(node, domDataKey, undefined);
	    }

	    function cleanSingleNode(node) {
	        // Run all the dispose callbacks
	        var callbacks = getDisposeCallbacksCollection(node, false);
	        if (callbacks) {
	            callbacks = callbacks.slice(0); // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
	            for (var i = 0; i < callbacks.length; i++)
	                callbacks[i](node);
	        }

	        // Also erase the DOM data
	        ko.utils.domData.clear(node);

	        // Special support for jQuery here because it's so commonly used.
	        // Many jQuery plugins (including jquery.tmpl) store data using jQuery's equivalent of domData
	        // so notify it to tear down any resources associated with the node & descendants here.
	        if ((typeof jQuery == "function") && (typeof jQuery['cleanData'] == "function"))
	            jQuery['cleanData']([node]);

	        // Also clear any immediate-child comment nodes, as these wouldn't have been found by
	        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
	        if (cleanableNodeTypesWithDescendants[node.nodeType])
	            cleanImmediateCommentTypeChildren(node);
	    }

	    function cleanImmediateCommentTypeChildren(nodeWithChildren) {
	        var child, nextChild = nodeWithChildren.firstChild;
	        while (child = nextChild) {
	            nextChild = child.nextSibling;
	            if (child.nodeType === 8)
	                cleanSingleNode(child);
	        }
	    }

	    return {
	        addDisposeCallback : function(node, callback) {
	            if (typeof callback != "function")
	                throw new Error("Callback must be a function");
	            getDisposeCallbacksCollection(node, true).push(callback);
	        },

	        removeDisposeCallback : function(node, callback) {
	            var callbacksCollection = getDisposeCallbacksCollection(node, false);
	            if (callbacksCollection) {
	                ko.utils.arrayRemoveItem(callbacksCollection, callback);
	                if (callbacksCollection.length == 0)
	                    destroyCallbacksCollection(node);
	            }
	        },

	        cleanNode : function(node) {
	            // First clean this node, where applicable
	            if (cleanableNodeTypes[node.nodeType]) {
	                cleanSingleNode(node);

	                // ... then its descendants, where applicable
	                if (cleanableNodeTypesWithDescendants[node.nodeType]) {
	                    // Clone the descendants list in case it changes during iteration
	                    var descendants = [];
	                    ko.utils.arrayPushAll(descendants, node.getElementsByTagName("*"));
	                    for (var i = 0, j = descendants.length; i < j; i++)
	                        cleanSingleNode(descendants[i]);
	                }
	            }
	            return node;
	        },

	        removeNode : function(node) {
	            ko.cleanNode(node);
	            if (node.parentNode)
	                node.parentNode.removeChild(node);
	        }
	    }
	})();
	ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
	ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
	ko.exportSymbol('cleanNode', ko.cleanNode);
	ko.exportSymbol('removeNode', ko.removeNode);
	ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
	ko.exportSymbol('utils.domNodeDisposal.addDisposeCallback', ko.utils.domNodeDisposal.addDisposeCallback);
	ko.exportSymbol('utils.domNodeDisposal.removeDisposeCallback', ko.utils.domNodeDisposal.removeDisposeCallback);
	(function () {
	    var leadingCommentRegex = /^(\s*)<!--(.*?)-->/;

	    function simpleHtmlParse(html) {
	        // Based on jQuery's "clean" function, but only accounting for table-related elements.
	        // If you have referenced jQuery, this won't be used anyway - KO will use jQuery's "clean" function directly

	        // Note that there's still an issue in IE < 9 whereby it will discard comment nodes that are the first child of
	        // a descendant node. For example: "<div><!-- mycomment -->abc</div>" will get parsed as "<div>abc</div>"
	        // This won't affect anyone who has referenced jQuery, and there's always the workaround of inserting a dummy node
	        // (possibly a text node) in front of the comment. So, KO does not attempt to workaround this IE issue automatically at present.

	        // Trim whitespace, otherwise indexOf won't work as expected
	        var tags = ko.utils.stringTrim(html).toLowerCase(), div = document.createElement("div");

	        // Finds the first match from the left column, and returns the corresponding "wrap" data from the right column
	        var wrap = tags.match(/^<(thead|tbody|tfoot)/)              && [1, "<table>", "</table>"] ||
	                   !tags.indexOf("<tr")                             && [2, "<table><tbody>", "</tbody></table>"] ||
	                   (!tags.indexOf("<td") || !tags.indexOf("<th"))   && [3, "<table><tbody><tr>", "</tr></tbody></table>"] ||
	                   /* anything else */                                 [0, "", ""];

	        // Go to html and back, then peel off extra wrappers
	        // Note that we always prefix with some dummy text, because otherwise, IE<9 will strip out leading comment nodes in descendants. Total madness.
	        var markup = "ignored<div>" + wrap[1] + html + wrap[2] + "</div>";
	        if (typeof window['innerShiv'] == "function") {
	            div.appendChild(window['innerShiv'](markup));
	        } else {
	            div.innerHTML = markup;
	        }

	        // Move to the right depth
	        while (wrap[0]--)
	            div = div.lastChild;

	        return ko.utils.makeArray(div.lastChild.childNodes);
	    }

	    function jQueryHtmlParse(html) {
	        // jQuery's "parseHTML" function was introduced in jQuery 1.8.0 and is a documented public API.
	        if (jQuery['parseHTML']) {
	            return jQuery['parseHTML'](html) || []; // Ensure we always return an array and never null
	        } else {
	            // For jQuery < 1.8.0, we fall back on the undocumented internal "clean" function.
	            var elems = jQuery['clean']([html]);

	            // As of jQuery 1.7.1, jQuery parses the HTML by appending it to some dummy parent nodes held in an in-memory document fragment.
	            // Unfortunately, it never clears the dummy parent nodes from the document fragment, so it leaks memory over time.
	            // Fix this by finding the top-most dummy parent element, and detaching it from its owner fragment.
	            if (elems && elems[0]) {
	                // Find the top-most parent element that's a direct child of a document fragment
	                var elem = elems[0];
	                while (elem.parentNode && elem.parentNode.nodeType !== 11 /* i.e., DocumentFragment */)
	                    elem = elem.parentNode;
	                // ... then detach it
	                if (elem.parentNode)
	                    elem.parentNode.removeChild(elem);
	            }

	            return elems;
	        }
	    }

	    ko.utils.parseHtmlFragment = function(html) {
	        return typeof jQuery != 'undefined' ? jQueryHtmlParse(html)   // As below, benefit from jQuery's optimisations where possible
	                                            : simpleHtmlParse(html);  // ... otherwise, this simple logic will do in most common cases.
	    };

	    ko.utils.setHtml = function(node, html) {
	        ko.utils.emptyDomNode(node);

	        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
	        html = ko.utils.unwrapObservable(html);

	        if ((html !== null) && (html !== undefined)) {
	            if (typeof html != 'string')
	                html = html.toString();

	            // jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
	            // for example <tr> elements which are not normally allowed to exist on their own.
	            // If you've referenced jQuery we'll use that rather than duplicating its code.
	            if (typeof jQuery != 'undefined') {
	                jQuery(node)['html'](html);
	            } else {
	                // ... otherwise, use KO's own parsing logic.
	                var parsedNodes = ko.utils.parseHtmlFragment(html);
	                for (var i = 0; i < parsedNodes.length; i++)
	                    node.appendChild(parsedNodes[i]);
	            }
	        }
	    };
	})();

	ko.exportSymbol('utils.parseHtmlFragment', ko.utils.parseHtmlFragment);
	ko.exportSymbol('utils.setHtml', ko.utils.setHtml);

	ko.memoization = (function () {
	    var memos = {};

	    function randomMax8HexChars() {
	        return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
	    }
	    function generateRandomId() {
	        return randomMax8HexChars() + randomMax8HexChars();
	    }
	    function findMemoNodes(rootNode, appendToArray) {
	        if (!rootNode)
	            return;
	        if (rootNode.nodeType == 8) {
	            var memoId = ko.memoization.parseMemoText(rootNode.nodeValue);
	            if (memoId != null)
	                appendToArray.push({ domNode: rootNode, memoId: memoId });
	        } else if (rootNode.nodeType == 1) {
	            for (var i = 0, childNodes = rootNode.childNodes, j = childNodes.length; i < j; i++)
	                findMemoNodes(childNodes[i], appendToArray);
	        }
	    }

	    return {
	        memoize: function (callback) {
	            if (typeof callback != "function")
	                throw new Error("You can only pass a function to ko.memoization.memoize()");
	            var memoId = generateRandomId();
	            memos[memoId] = callback;
	            return "<!--[ko_memo:" + memoId + "]-->";
	        },

	        unmemoize: function (memoId, callbackParams) {
	            var callback = memos[memoId];
	            if (callback === undefined)
	                throw new Error("Couldn't find any memo with ID " + memoId + ". Perhaps it's already been unmemoized.");
	            try {
	                callback.apply(null, callbackParams || []);
	                return true;
	            }
	            finally { delete memos[memoId]; }
	        },

	        unmemoizeDomNodeAndDescendants: function (domNode, extraCallbackParamsArray) {
	            var memos = [];
	            findMemoNodes(domNode, memos);
	            for (var i = 0, j = memos.length; i < j; i++) {
	                var node = memos[i].domNode;
	                var combinedParams = [node];
	                if (extraCallbackParamsArray)
	                    ko.utils.arrayPushAll(combinedParams, extraCallbackParamsArray);
	                ko.memoization.unmemoize(memos[i].memoId, combinedParams);
	                node.nodeValue = ""; // Neuter this node so we don't try to unmemoize it again
	                if (node.parentNode)
	                    node.parentNode.removeChild(node); // If possible, erase it totally (not always possible - someone else might just hold a reference to it then call unmemoizeDomNodeAndDescendants again)
	            }
	        },

	        parseMemoText: function (memoText) {
	            var match = memoText.match(/^\[ko_memo\:(.*?)\]$/);
	            return match ? match[1] : null;
	        }
	    };
	})();

	ko.exportSymbol('memoization', ko.memoization);
	ko.exportSymbol('memoization.memoize', ko.memoization.memoize);
	ko.exportSymbol('memoization.unmemoize', ko.memoization.unmemoize);
	ko.exportSymbol('memoization.parseMemoText', ko.memoization.parseMemoText);
	ko.exportSymbol('memoization.unmemoizeDomNodeAndDescendants', ko.memoization.unmemoizeDomNodeAndDescendants);
	ko.extenders = {
	    'throttle': function(target, timeout) {
	        // Throttling means two things:

	        // (1) For dependent observables, we throttle *evaluations* so that, no matter how fast its dependencies
	        //     notify updates, the target doesn't re-evaluate (and hence doesn't notify) faster than a certain rate
	        target['throttleEvaluation'] = timeout;

	        // (2) For writable targets (observables, or writable dependent observables), we throttle *writes*
	        //     so the target cannot change value synchronously or faster than a certain rate
	        var writeTimeoutInstance = null;
	        return ko.dependentObservable({
	            'read': target,
	            'write': function(value) {
	                clearTimeout(writeTimeoutInstance);
	                writeTimeoutInstance = setTimeout(function() {
	                    target(value);
	                }, timeout);
	            }
	        });
	    },

	    'notify': function(target, notifyWhen) {
	        target["equalityComparer"] = notifyWhen == "always"
	            ? function() { return false } // Treat all values as not equal
	            : ko.observable["fn"]["equalityComparer"];
	        return target;
	    }
	};

	function applyExtenders(requestedExtenders) {
	    var target = this;
	    if (requestedExtenders) {
	        ko.utils.objectForEach(requestedExtenders, function(key, value) {
	            var extenderHandler = ko.extenders[key];
	            if (typeof extenderHandler == 'function') {
	                target = extenderHandler(target, value);
	            }
	        });
	    }
	    return target;
	}

	ko.exportSymbol('extenders', ko.extenders);

	ko.subscription = function (target, callback, disposeCallback) {
	    this.target = target;
	    this.callback = callback;
	    this.disposeCallback = disposeCallback;
	    ko.exportProperty(this, 'dispose', this.dispose);
	};
	ko.subscription.prototype.dispose = function () {
	    this.isDisposed = true;
	    this.disposeCallback();
	};

	ko.subscribable = function () {
	    this._subscriptions = {};

	    ko.utils.extend(this, ko.subscribable['fn']);
	    ko.exportProperty(this, 'subscribe', this.subscribe);
	    ko.exportProperty(this, 'extend', this.extend);
	    ko.exportProperty(this, 'getSubscriptionsCount', this.getSubscriptionsCount);
	}

	var defaultEvent = "change";

	ko.subscribable['fn'] = {
	    subscribe: function (callback, callbackTarget, event) {
	        event = event || defaultEvent;
	        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

	        var subscription = new ko.subscription(this, boundCallback, function () {
	            ko.utils.arrayRemoveItem(this._subscriptions[event], subscription);
	        }.bind(this));

	        if (!this._subscriptions[event])
	            this._subscriptions[event] = [];
	        this._subscriptions[event].push(subscription);
	        return subscription;
	    },

	    "notifySubscribers": function (valueToNotify, event) {
	        event = event || defaultEvent;
	        if (this._subscriptions[event]) {
	            ko.dependencyDetection.ignore(function() {
	                ko.utils.arrayForEach(this._subscriptions[event].slice(0), function (subscription) {
	                    // In case a subscription was disposed during the arrayForEach cycle, check
	                    // for isDisposed on each subscription before invoking its callback
	                    if (subscription && (subscription.isDisposed !== true))
	                        subscription.callback(valueToNotify);
	                });
	            }, this);
	        }
	    },

	    getSubscriptionsCount: function () {
	        var total = 0;
	        ko.utils.objectForEach(this._subscriptions, function(eventName, subscriptions) {
	            total += subscriptions.length;
	        });
	        return total;
	    },

	    extend: applyExtenders
	};


	ko.isSubscribable = function (instance) {
	    return typeof instance.subscribe == "function" && typeof instance["notifySubscribers"] == "function";
	};

	ko.exportSymbol('subscribable', ko.subscribable);
	ko.exportSymbol('isSubscribable', ko.isSubscribable);

	ko.dependencyDetection = (function () {
	    var _frames = [];

	    return {
	        begin: function (callback) {
	            _frames.push({ callback: callback, distinctDependencies:[] });
	        },

	        end: function () {
	            _frames.pop();
	        },

	        registerDependency: function (subscribable) {
	            if (!ko.isSubscribable(subscribable))
	                throw new Error("Only subscribable things can act as dependencies");
	            if (_frames.length > 0) {
	                var topFrame = _frames[_frames.length - 1];
	                if (!topFrame || ko.utils.arrayIndexOf(topFrame.distinctDependencies, subscribable) >= 0)
	                    return;
	                topFrame.distinctDependencies.push(subscribable);
	                topFrame.callback(subscribable);
	            }
	        },

	        ignore: function(callback, callbackTarget, callbackArgs) {
	            try {
	                _frames.push(null);
	                return callback.apply(callbackTarget, callbackArgs || []);
	            } finally {
	                _frames.pop();
	            }
	        }
	    };
	})();
	var primitiveTypes = { 'undefined':true, 'boolean':true, 'number':true, 'string':true };

	ko.observable = function (initialValue) {
	    var _latestValue = initialValue;

	    function observable() {
	        if (arguments.length > 0) {
	            // Write

	            // Ignore writes if the value hasn't changed
	            if ((!observable['equalityComparer']) || !observable['equalityComparer'](_latestValue, arguments[0])) {
	                observable.valueWillMutate();
	                _latestValue = arguments[0];
	                if (DEBUG) observable._latestValue = _latestValue;
	                observable.valueHasMutated();
	            }
	            return this; // Permits chained assignments
	        }
	        else {
	            // Read
	            ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
	            return _latestValue;
	        }
	    }
	    if (DEBUG) observable._latestValue = _latestValue;
	    ko.subscribable.call(observable);
	    observable.peek = function() { return _latestValue };
	    observable.valueHasMutated = function () { observable["notifySubscribers"](_latestValue); }
	    observable.valueWillMutate = function () { observable["notifySubscribers"](_latestValue, "beforeChange"); }
	    ko.utils.extend(observable, ko.observable['fn']);

	    ko.exportProperty(observable, 'peek', observable.peek);
	    ko.exportProperty(observable, "valueHasMutated", observable.valueHasMutated);
	    ko.exportProperty(observable, "valueWillMutate", observable.valueWillMutate);

	    return observable;
	}

	ko.observable['fn'] = {
	    "equalityComparer": function valuesArePrimitiveAndEqual(a, b) {
	        var oldValueIsPrimitive = (a === null) || (typeof(a) in primitiveTypes);
	        return oldValueIsPrimitive ? (a === b) : false;
	    }
	};

	var protoProperty = ko.observable.protoProperty = "__ko_proto__";
	ko.observable['fn'][protoProperty] = ko.observable;

	ko.hasPrototype = function(instance, prototype) {
	    if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) return false;
	    if (instance[protoProperty] === prototype) return true;
	    return ko.hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
	};

	ko.isObservable = function (instance) {
	    return ko.hasPrototype(instance, ko.observable);
	}
	ko.isWriteableObservable = function (instance) {
	    // Observable
	    if ((typeof instance == "function") && instance[protoProperty] === ko.observable)
	        return true;
	    // Writeable dependent observable
	    if ((typeof instance == "function") && (instance[protoProperty] === ko.dependentObservable) && (instance.hasWriteFunction))
	        return true;
	    // Anything else
	    return false;
	}


	ko.exportSymbol('observable', ko.observable);
	ko.exportSymbol('isObservable', ko.isObservable);
	ko.exportSymbol('isWriteableObservable', ko.isWriteableObservable);
	ko.observableArray = function (initialValues) {
	    if (arguments.length == 0) {
	        // Zero-parameter constructor initializes to empty array
	        initialValues = [];
	    }
	    if ((initialValues !== null) && (initialValues !== undefined) && !('length' in initialValues))
	        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

	    var result = ko.observable(initialValues);
	    ko.utils.extend(result, ko.observableArray['fn']);
	    return result;
	}

	ko.observableArray['fn'] = {
	    'remove': function (valueOrPredicate) {
	        var underlyingArray = this.peek();
	        var removedValues = [];
	        var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
	        for (var i = 0; i < underlyingArray.length; i++) {
	            var value = underlyingArray[i];
	            if (predicate(value)) {
	                if (removedValues.length === 0) {
	                    this.valueWillMutate();
	                }
	                removedValues.push(value);
	                underlyingArray.splice(i, 1);
	                i--;
	            }
	        }
	        if (removedValues.length) {
	            this.valueHasMutated();
	        }
	        return removedValues;
	    },

	    'removeAll': function (arrayOfValues) {
	        // If you passed zero args, we remove everything
	        if (arrayOfValues === undefined) {
	            var underlyingArray = this.peek();
	            var allValues = underlyingArray.slice(0);
	            this.valueWillMutate();
	            underlyingArray.splice(0, underlyingArray.length);
	            this.valueHasMutated();
	            return allValues;
	        }
	        // If you passed an arg, we interpret it as an array of entries to remove
	        if (!arrayOfValues)
	            return [];
	        return this['remove'](function (value) {
	            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
	        });
	    },

	    'destroy': function (valueOrPredicate) {
	        var underlyingArray = this.peek();
	        var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
	        this.valueWillMutate();
	        for (var i = underlyingArray.length - 1; i >= 0; i--) {
	            var value = underlyingArray[i];
	            if (predicate(value))
	                underlyingArray[i]["_destroy"] = true;
	        }
	        this.valueHasMutated();
	    },

	    'destroyAll': function (arrayOfValues) {
	        // If you passed zero args, we destroy everything
	        if (arrayOfValues === undefined)
	            return this['destroy'](function() { return true });

	        // If you passed an arg, we interpret it as an array of entries to destroy
	        if (!arrayOfValues)
	            return [];
	        return this['destroy'](function (value) {
	            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
	        });
	    },

	    'indexOf': function (item) {
	        var underlyingArray = this();
	        return ko.utils.arrayIndexOf(underlyingArray, item);
	    },

	    'replace': function(oldItem, newItem) {
	        var index = this['indexOf'](oldItem);
	        if (index >= 0) {
	            this.valueWillMutate();
	            this.peek()[index] = newItem;
	            this.valueHasMutated();
	        }
	    }
	}

	// Populate ko.observableArray.fn with read/write functions from native arrays
	// Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
	// because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
	ko.utils.arrayForEach(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (methodName) {
	    ko.observableArray['fn'][methodName] = function () {
	        // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
	        // (for consistency with mutating regular observables)
	        var underlyingArray = this.peek();
	        this.valueWillMutate();
	        var methodCallResult = underlyingArray[methodName].apply(underlyingArray, arguments);
	        this.valueHasMutated();
	        return methodCallResult;
	    };
	});

	// Populate ko.observableArray.fn with read-only functions from native arrays
	ko.utils.arrayForEach(["slice"], function (methodName) {
	    ko.observableArray['fn'][methodName] = function () {
	        var underlyingArray = this();
	        return underlyingArray[methodName].apply(underlyingArray, arguments);
	    };
	});

	ko.exportSymbol('observableArray', ko.observableArray);
	ko.dependentObservable = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
	    var _latestValue,
	        _hasBeenEvaluated = false,
	        _isBeingEvaluated = false,
	        readFunction = evaluatorFunctionOrOptions;

	    if (readFunction && typeof readFunction == "object") {
	        // Single-parameter syntax - everything is on this "options" param
	        options = readFunction;
	        readFunction = options["read"];
	    } else {
	        // Multi-parameter syntax - construct the options according to the params passed
	        options = options || {};
	        if (!readFunction)
	            readFunction = options["read"];
	    }
	    if (typeof readFunction != "function")
	        throw new Error("Pass a function that returns the value of the ko.computed");

	    function addSubscriptionToDependency(subscribable) {
	        _subscriptionsToDependencies.push(subscribable.subscribe(evaluatePossiblyAsync));
	    }

	    function disposeAllSubscriptionsToDependencies() {
	        ko.utils.arrayForEach(_subscriptionsToDependencies, function (subscription) {
	            subscription.dispose();
	        });
	        _subscriptionsToDependencies = [];
	    }

	    function evaluatePossiblyAsync() {
	        var throttleEvaluationTimeout = dependentObservable['throttleEvaluation'];
	        if (throttleEvaluationTimeout && throttleEvaluationTimeout >= 0) {
	            clearTimeout(evaluationTimeoutInstance);
	            evaluationTimeoutInstance = setTimeout(evaluateImmediate, throttleEvaluationTimeout);
	        } else
	            evaluateImmediate();
	    }

	    function evaluateImmediate() {
	        if (_isBeingEvaluated) {
	            // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
	            // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
	            // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
	            // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
	            return;
	        }

	        // Don't dispose on first evaluation, because the "disposeWhen" callback might
	        // e.g., dispose when the associated DOM element isn't in the doc, and it's not
	        // going to be in the doc until *after* the first evaluation
	        if (_hasBeenEvaluated && disposeWhen()) {
	            dispose();
	            return;
	        }

	        _isBeingEvaluated = true;
	        try {
	            // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
	            // Then, during evaluation, we cross off any that are in fact still being used.
	            var disposalCandidates = ko.utils.arrayMap(_subscriptionsToDependencies, function(item) {return item.target;});

	            ko.dependencyDetection.begin(function(subscribable) {
	                var inOld;
	                if ((inOld = ko.utils.arrayIndexOf(disposalCandidates, subscribable)) >= 0)
	                    disposalCandidates[inOld] = undefined; // Don't want to dispose this subscription, as it's still being used
	                else
	                    addSubscriptionToDependency(subscribable); // Brand new subscription - add it
	            });

	            var newValue = readFunction.call(evaluatorFunctionTarget);

	            // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
	            for (var i = disposalCandidates.length - 1; i >= 0; i--) {
	                if (disposalCandidates[i])
	                    _subscriptionsToDependencies.splice(i, 1)[0].dispose();
	            }
	            _hasBeenEvaluated = true;

	            dependentObservable["notifySubscribers"](_latestValue, "beforeChange");
	            _latestValue = newValue;
	            if (DEBUG) dependentObservable._latestValue = _latestValue;
	        } finally {
	            ko.dependencyDetection.end();
	        }

	        dependentObservable["notifySubscribers"](_latestValue);
	        _isBeingEvaluated = false;
	        if (!_subscriptionsToDependencies.length)
	            dispose();
	    }

	    function dependentObservable() {
	        if (arguments.length > 0) {
	            if (typeof writeFunction === "function") {
	                // Writing a value
	                writeFunction.apply(evaluatorFunctionTarget, arguments);
	            } else {
	                throw new Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
	            }
	            return this; // Permits chained assignments
	        } else {
	            // Reading the value
	            if (!_hasBeenEvaluated)
	                evaluateImmediate();
	            ko.dependencyDetection.registerDependency(dependentObservable);
	            return _latestValue;
	        }
	    }

	    function peek() {
	        if (!_hasBeenEvaluated)
	            evaluateImmediate();
	        return _latestValue;
	    }

	    function isActive() {
	        return !_hasBeenEvaluated || _subscriptionsToDependencies.length > 0;
	    }

	    // By here, "options" is always non-null
	    var writeFunction = options["write"],
	        disposeWhenNodeIsRemoved = options["disposeWhenNodeIsRemoved"] || options.disposeWhenNodeIsRemoved || null,
	        disposeWhen = options["disposeWhen"] || options.disposeWhen || function() { return false; },
	        dispose = disposeAllSubscriptionsToDependencies,
	        _subscriptionsToDependencies = [],
	        evaluationTimeoutInstance = null;

	    if (!evaluatorFunctionTarget)
	        evaluatorFunctionTarget = options["owner"];

	    dependentObservable.peek = peek;
	    dependentObservable.getDependenciesCount = function () { return _subscriptionsToDependencies.length; };
	    dependentObservable.hasWriteFunction = typeof options["write"] === "function";
	    dependentObservable.dispose = function () { dispose(); };
	    dependentObservable.isActive = isActive;

	    ko.subscribable.call(dependentObservable);
	    ko.utils.extend(dependentObservable, ko.dependentObservable['fn']);

	    ko.exportProperty(dependentObservable, 'peek', dependentObservable.peek);
	    ko.exportProperty(dependentObservable, 'dispose', dependentObservable.dispose);
	    ko.exportProperty(dependentObservable, 'isActive', dependentObservable.isActive);
	    ko.exportProperty(dependentObservable, 'getDependenciesCount', dependentObservable.getDependenciesCount);

	    // Evaluate, unless deferEvaluation is true
	    if (options['deferEvaluation'] !== true)
	        evaluateImmediate();

	    // Build "disposeWhenNodeIsRemoved" and "disposeWhenNodeIsRemovedCallback" option values.
	    // But skip if isActive is false (there will never be any dependencies to dispose).
	    // (Note: "disposeWhenNodeIsRemoved" option both proactively disposes as soon as the node is removed using ko.removeNode(),
	    // plus adds a "disposeWhen" callback that, on each evaluation, disposes if the node was removed by some other means.)
	    if (disposeWhenNodeIsRemoved && isActive()) {
	        dispose = function() {
	            ko.utils.domNodeDisposal.removeDisposeCallback(disposeWhenNodeIsRemoved, dispose);
	            disposeAllSubscriptionsToDependencies();
	        };
	        ko.utils.domNodeDisposal.addDisposeCallback(disposeWhenNodeIsRemoved, dispose);
	        var existingDisposeWhenFunction = disposeWhen;
	        disposeWhen = function () {
	            return !ko.utils.domNodeIsAttachedToDocument(disposeWhenNodeIsRemoved) || existingDisposeWhenFunction();
	        }
	    }

	    return dependentObservable;
	};

	ko.isComputed = function(instance) {
	    return ko.hasPrototype(instance, ko.dependentObservable);
	};

	var protoProp = ko.observable.protoProperty; // == "__ko_proto__"
	ko.dependentObservable[protoProp] = ko.observable;

	ko.dependentObservable['fn'] = {};
	ko.dependentObservable['fn'][protoProp] = ko.dependentObservable;

	ko.exportSymbol('dependentObservable', ko.dependentObservable);
	ko.exportSymbol('computed', ko.dependentObservable); // Make "ko.computed" an alias for "ko.dependentObservable"
	ko.exportSymbol('isComputed', ko.isComputed);

	(function() {
	    var maxNestedObservableDepth = 10; // Escape the (unlikely) pathalogical case where an observable's current value is itself (or similar reference cycle)

	    ko.toJS = function(rootObject) {
	        if (arguments.length == 0)
	            throw new Error("When calling ko.toJS, pass the object you want to convert.");

	        // We just unwrap everything at every level in the object graph
	        return mapJsObjectGraph(rootObject, function(valueToMap) {
	            // Loop because an observable's value might in turn be another observable wrapper
	            for (var i = 0; ko.isObservable(valueToMap) && (i < maxNestedObservableDepth); i++)
	                valueToMap = valueToMap();
	            return valueToMap;
	        });
	    };

	    ko.toJSON = function(rootObject, replacer, space) {     // replacer and space are optional
	        var plainJavaScriptObject = ko.toJS(rootObject);
	        return ko.utils.stringifyJson(plainJavaScriptObject, replacer, space);
	    };

	    function mapJsObjectGraph(rootObject, mapInputCallback, visitedObjects) {
	        visitedObjects = visitedObjects || new objectLookup();

	        rootObject = mapInputCallback(rootObject);
	        var canHaveProperties = (typeof rootObject == "object") && (rootObject !== null) && (rootObject !== undefined) && (!(rootObject instanceof Date));
	        if (!canHaveProperties)
	            return rootObject;

	        var outputProperties = rootObject instanceof Array ? [] : {};
	        visitedObjects.save(rootObject, outputProperties);

	        visitPropertiesOrArrayEntries(rootObject, function(indexer) {
	            var propertyValue = mapInputCallback(rootObject[indexer]);

	            switch (typeof propertyValue) {
	                case "boolean":
	                case "number":
	                case "string":
	                case "function":
	                    outputProperties[indexer] = propertyValue;
	                    break;
	                case "object":
	                case "undefined":
	                    var previouslyMappedValue = visitedObjects.get(propertyValue);
	                    outputProperties[indexer] = (previouslyMappedValue !== undefined)
	                        ? previouslyMappedValue
	                        : mapJsObjectGraph(propertyValue, mapInputCallback, visitedObjects);
	                    break;
	            }
	        });

	        return outputProperties;
	    }

	    function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
	        if (rootObject instanceof Array) {
	            for (var i = 0; i < rootObject.length; i++)
	                visitorCallback(i);

	            // For arrays, also respect toJSON property for custom mappings (fixes #278)
	            if (typeof rootObject['toJSON'] == 'function')
	                visitorCallback('toJSON');
	        } else {
	            for (var propertyName in rootObject) {
	                visitorCallback(propertyName);
	            }
	        }
	    };

	    function objectLookup() {
	        var keys = [];
	        var values = [];
	        this.save = function(key, value) {
	            var existingIndex = ko.utils.arrayIndexOf(keys, key);
	            if (existingIndex >= 0)
	                values[existingIndex] = value;
	            else {
	                keys.push(key);
	                values.push(value);
	            }
	        };
	        this.get = function(key) {
	            var existingIndex = ko.utils.arrayIndexOf(keys, key);
	            return (existingIndex >= 0) ? values[existingIndex] : undefined;
	        };
	    };
	})();

	ko.exportSymbol('toJS', ko.toJS);
	ko.exportSymbol('toJSON', ko.toJSON);
	(function () {
	    var hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

	    // Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
	    // are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
	    // that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
	    ko.selectExtensions = {
	        readValue : function(element) {
	            switch (ko.utils.tagNameLower(element)) {
	                case 'option':
	                    if (element[hasDomDataExpandoProperty] === true)
	                        return ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey);
	                    return ko.utils.ieVersion <= 7
	                        ? (element.getAttributeNode('value').specified ? element.value : element.text)
	                        : element.value;
	                case 'select':
	                    return element.selectedIndex >= 0 ? ko.selectExtensions.readValue(element.options[element.selectedIndex]) : undefined;
	                default:
	                    return element.value;
	            }
	        },

	        writeValue: function(element, value) {
	            switch (ko.utils.tagNameLower(element)) {
	                case 'option':
	                    switch(typeof value) {
	                        case "string":
	                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
	                            if (hasDomDataExpandoProperty in element) { // IE <= 8 throws errors if you delete non-existent properties from a DOM node
	                                delete element[hasDomDataExpandoProperty];
	                            }
	                            element.value = value;
	                            break;
	                        default:
	                            // Store arbitrary object using DomData
	                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
	                            element[hasDomDataExpandoProperty] = true;

	                            // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
	                            element.value = typeof value === "number" ? value : "";
	                            break;
	                    }
	                    break;
	                case 'select':
	                    for (var i = element.options.length - 1; i >= 0; i--) {
	                        if (ko.selectExtensions.readValue(element.options[i]) == value) {
	                            element.selectedIndex = i;
	                            break;
	                        }
	                    }
	                    break;
	                default:
	                    if ((value === null) || (value === undefined))
	                        value = "";
	                    element.value = value;
	                    break;
	            }
	        }
	    };
	})();

	ko.exportSymbol('selectExtensions', ko.selectExtensions);
	ko.exportSymbol('selectExtensions.readValue', ko.selectExtensions.readValue);
	ko.exportSymbol('selectExtensions.writeValue', ko.selectExtensions.writeValue);
	ko.expressionRewriting = (function () {
	    var restoreCapturedTokensRegex = /\@ko_token_(\d+)\@/g;
	    var javaScriptReservedWords = ["true", "false"];

	    // Matches something that can be assigned to--either an isolated identifier or something ending with a property accessor
	    // This is designed to be simple and avoid false negatives, but could produce false positives (e.g., a+b.c).
	    var javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i;

	    function restoreTokens(string, tokens) {
	        var prevValue = null;
	        while (string != prevValue) { // Keep restoring tokens until it no longer makes a difference (they may be nested)
	            prevValue = string;
	            string = string.replace(restoreCapturedTokensRegex, function (match, tokenIndex) {
	                return tokens[tokenIndex];
	            });
	        }
	        return string;
	    }

	    function getWriteableValue(expression) {
	        if (ko.utils.arrayIndexOf(javaScriptReservedWords, ko.utils.stringTrim(expression).toLowerCase()) >= 0)
	            return false;
	        var match = expression.match(javaScriptAssignmentTarget);
	        return match === null ? false : match[1] ? ('Object(' + match[1] + ')' + match[2]) : expression;
	    }

	    function ensureQuoted(key) {
	        var trimmedKey = ko.utils.stringTrim(key);
	        switch (trimmedKey.length && trimmedKey.charAt(0)) {
	            case "'":
	            case '"':
	                return key;
	            default:
	                return "'" + trimmedKey + "'";
	        }
	    }

	    return {
	        bindingRewriteValidators: [],

	        parseObjectLiteral: function(objectLiteralString) {
	            // A full tokeniser+lexer would add too much weight to this library, so here's a simple parser
	            // that is sufficient just to split an object literal string into a set of top-level key-value pairs

	            var str = ko.utils.stringTrim(objectLiteralString);
	            if (str.length < 3)
	                return [];
	            if (str.charAt(0) === "{")// Ignore any braces surrounding the whole object literal
	                str = str.substring(1, str.length - 1);

	            // Pull out any string literals and regex literals
	            var tokens = [];
	            var tokenStart = null, tokenEndChar;
	            for (var position = 0; position < str.length; position++) {
	                var c = str.charAt(position);
	                if (tokenStart === null) {
	                    switch (c) {
	                        case '"':
	                        case "'":
	                        case "/":
	                            tokenStart = position;
	                            tokenEndChar = c;
	                            break;
	                    }
	                } else if ((c == tokenEndChar) && (str.charAt(position - 1) !== "\\")) {
	                    var token = str.substring(tokenStart, position + 1);
	                    tokens.push(token);
	                    var replacement = "@ko_token_" + (tokens.length - 1) + "@";
	                    str = str.substring(0, tokenStart) + replacement + str.substring(position + 1);
	                    position -= (token.length - replacement.length);
	                    tokenStart = null;
	                }
	            }

	            // Next pull out balanced paren, brace, and bracket blocks
	            tokenStart = null;
	            tokenEndChar = null;
	            var tokenDepth = 0, tokenStartChar = null;
	            for (var position = 0; position < str.length; position++) {
	                var c = str.charAt(position);
	                if (tokenStart === null) {
	                    switch (c) {
	                        case "{": tokenStart = position; tokenStartChar = c;
	                                  tokenEndChar = "}";
	                                  break;
	                        case "(": tokenStart = position; tokenStartChar = c;
	                                  tokenEndChar = ")";
	                                  break;
	                        case "[": tokenStart = position; tokenStartChar = c;
	                                  tokenEndChar = "]";
	                                  break;
	                    }
	                }

	                if (c === tokenStartChar)
	                    tokenDepth++;
	                else if (c === tokenEndChar) {
	                    tokenDepth--;
	                    if (tokenDepth === 0) {
	                        var token = str.substring(tokenStart, position + 1);
	                        tokens.push(token);
	                        var replacement = "@ko_token_" + (tokens.length - 1) + "@";
	                        str = str.substring(0, tokenStart) + replacement + str.substring(position + 1);
	                        position -= (token.length - replacement.length);
	                        tokenStart = null;
	                    }
	                }
	            }

	            // Now we can safely split on commas to get the key/value pairs
	            var result = [];
	            var keyValuePairs = str.split(",");
	            for (var i = 0, j = keyValuePairs.length; i < j; i++) {
	                var pair = keyValuePairs[i];
	                var colonPos = pair.indexOf(":");
	                if ((colonPos > 0) && (colonPos < pair.length - 1)) {
	                    var key = pair.substring(0, colonPos);
	                    var value = pair.substring(colonPos + 1);
	                    result.push({ 'key': restoreTokens(key, tokens), 'value': restoreTokens(value, tokens) });
	                } else {
	                    result.push({ 'unknown': restoreTokens(pair, tokens) });
	                }
	            }
	            return result;
	        },

	        preProcessBindings: function (objectLiteralStringOrKeyValueArray) {
	            var keyValueArray = typeof objectLiteralStringOrKeyValueArray === "string"
	                ? ko.expressionRewriting.parseObjectLiteral(objectLiteralStringOrKeyValueArray)
	                : objectLiteralStringOrKeyValueArray;
	            var resultStrings = [], propertyAccessorResultStrings = [];

	            var keyValueEntry;
	            for (var i = 0; keyValueEntry = keyValueArray[i]; i++) {
	                if (resultStrings.length > 0)
	                    resultStrings.push(",");

	                if (keyValueEntry['key']) {
	                    var quotedKey = ensureQuoted(keyValueEntry['key']), val = keyValueEntry['value'];
	                    resultStrings.push(quotedKey);
	                    resultStrings.push(":");
	                    resultStrings.push(val);

	                    if (val = getWriteableValue(ko.utils.stringTrim(val))) {
	                        if (propertyAccessorResultStrings.length > 0)
	                            propertyAccessorResultStrings.push(", ");
	                        propertyAccessorResultStrings.push(quotedKey + " : function(__ko_value) { " + val + " = __ko_value; }");
	                    }
	                } else if (keyValueEntry['unknown']) {
	                    resultStrings.push(keyValueEntry['unknown']);
	                }
	            }

	            var combinedResult = resultStrings.join("");
	            if (propertyAccessorResultStrings.length > 0) {
	                var allPropertyAccessors = propertyAccessorResultStrings.join("");
	                combinedResult = combinedResult + ", '_ko_property_writers' : { " + allPropertyAccessors + " } ";
	            }

	            return combinedResult;
	        },

	        keyValueArrayContainsKey: function(keyValueArray, key) {
	            for (var i = 0; i < keyValueArray.length; i++)
	                if (ko.utils.stringTrim(keyValueArray[i]['key']) == key)
	                    return true;
	            return false;
	        },

	        // Internal, private KO utility for updating model properties from within bindings
	        // property:            If the property being updated is (or might be) an observable, pass it here
	        //                      If it turns out to be a writable observable, it will be written to directly
	        // allBindingsAccessor: All bindings in the current execution context.
	        //                      This will be searched for a '_ko_property_writers' property in case you're writing to a non-observable
	        // key:                 The key identifying the property to be written. Example: for { hasFocus: myValue }, write to 'myValue' by specifying the key 'hasFocus'
	        // value:               The value to be written
	        // checkIfDifferent:    If true, and if the property being written is a writable observable, the value will only be written if
	        //                      it is !== existing value on that writable observable
	        writeValueToProperty: function(property, allBindingsAccessor, key, value, checkIfDifferent) {
	            if (!property || !ko.isObservable(property)) {
	                var propWriters = allBindingsAccessor()['_ko_property_writers'];
	                if (propWriters && propWriters[key])
	                    propWriters[key](value);
	            } else if (ko.isWriteableObservable(property) && (!checkIfDifferent || property.peek() !== value)) {
	                property(value);
	            }
	        }
	    };
	})();

	ko.exportSymbol('expressionRewriting', ko.expressionRewriting);
	ko.exportSymbol('expressionRewriting.bindingRewriteValidators', ko.expressionRewriting.bindingRewriteValidators);
	ko.exportSymbol('expressionRewriting.parseObjectLiteral', ko.expressionRewriting.parseObjectLiteral);
	ko.exportSymbol('expressionRewriting.preProcessBindings', ko.expressionRewriting.preProcessBindings);

	// For backward compatibility, define the following aliases. (Previously, these function names were misleading because
	// they referred to JSON specifically, even though they actually work with arbitrary JavaScript object literal expressions.)
	ko.exportSymbol('jsonExpressionRewriting', ko.expressionRewriting);
	ko.exportSymbol('jsonExpressionRewriting.insertPropertyAccessorsIntoJson', ko.expressionRewriting.preProcessBindings);(function() {
	    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
	    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
	    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
	    // of that virtual hierarchy
	    //
	    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
	    // without having to scatter special cases all over the binding and templating code.

	    // IE 9 cannot reliably read the "nodeValue" property of a comment node (see https://github.com/SteveSanderson/knockout/issues/186)
	    // but it does give them a nonstandard alternative property called "text" that it can read reliably. Other browsers don't have that property.
	    // So, use node.text where available, and node.nodeValue elsewhere
	    var commentNodesHaveTextProperty = document && document.createComment("test").text === "<!--test-->";

	    var startCommentRegex = commentNodesHaveTextProperty ? /^<!--\s*ko(?:\s+(.+\s*\:[\s\S]*))?\s*-->$/ : /^\s*ko(?:\s+(.+\s*\:[\s\S]*))?\s*$/;
	    var endCommentRegex =   commentNodesHaveTextProperty ? /^<!--\s*\/ko\s*-->$/ : /^\s*\/ko\s*$/;
	    var htmlTagsWithOptionallyClosingChildren = { 'ul': true, 'ol': true };

	    function isStartComment(node) {
	        return (node.nodeType == 8) && (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(startCommentRegex);
	    }

	    function isEndComment(node) {
	        return (node.nodeType == 8) && (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(endCommentRegex);
	    }

	    function getVirtualChildren(startComment, allowUnbalanced) {
	        var currentNode = startComment;
	        var depth = 1;
	        var children = [];
	        while (currentNode = currentNode.nextSibling) {
	            if (isEndComment(currentNode)) {
	                depth--;
	                if (depth === 0)
	                    return children;
	            }

	            children.push(currentNode);

	            if (isStartComment(currentNode))
	                depth++;
	        }
	        if (!allowUnbalanced)
	            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
	        return null;
	    }

	    function getMatchingEndComment(startComment, allowUnbalanced) {
	        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
	        if (allVirtualChildren) {
	            if (allVirtualChildren.length > 0)
	                return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
	            return startComment.nextSibling;
	        } else
	            return null; // Must have no matching end comment, and allowUnbalanced is true
	    }

	    function getUnbalancedChildTags(node) {
	        // e.g., from <div>OK</div><!-- ko blah --><span>Another</span>, returns: <!-- ko blah --><span>Another</span>
	        //       from <div>OK</div><!-- /ko --><!-- /ko -->,             returns: <!-- /ko --><!-- /ko -->
	        var childNode = node.firstChild, captureRemaining = null;
	        if (childNode) {
	            do {
	                if (captureRemaining)                   // We already hit an unbalanced node and are now just scooping up all subsequent nodes
	                    captureRemaining.push(childNode);
	                else if (isStartComment(childNode)) {
	                    var matchingEndComment = getMatchingEndComment(childNode, /* allowUnbalanced: */ true);
	                    if (matchingEndComment)             // It's a balanced tag, so skip immediately to the end of this virtual set
	                        childNode = matchingEndComment;
	                    else
	                        captureRemaining = [childNode]; // It's unbalanced, so start capturing from this point
	                } else if (isEndComment(childNode)) {
	                    captureRemaining = [childNode];     // It's unbalanced (if it wasn't, we'd have skipped over it already), so start capturing
	                }
	            } while (childNode = childNode.nextSibling);
	        }
	        return captureRemaining;
	    }

	    ko.virtualElements = {
	        allowedBindings: {},

	        childNodes: function(node) {
	            return isStartComment(node) ? getVirtualChildren(node) : node.childNodes;
	        },

	        emptyNode: function(node) {
	            if (!isStartComment(node))
	                ko.utils.emptyDomNode(node);
	            else {
	                var virtualChildren = ko.virtualElements.childNodes(node);
	                for (var i = 0, j = virtualChildren.length; i < j; i++)
	                    ko.removeNode(virtualChildren[i]);
	            }
	        },

	        setDomNodeChildren: function(node, childNodes) {
	            if (!isStartComment(node))
	                ko.utils.setDomNodeChildren(node, childNodes);
	            else {
	                ko.virtualElements.emptyNode(node);
	                var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
	                for (var i = 0, j = childNodes.length; i < j; i++)
	                    endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
	            }
	        },

	        prepend: function(containerNode, nodeToPrepend) {
	            if (!isStartComment(containerNode)) {
	                if (containerNode.firstChild)
	                    containerNode.insertBefore(nodeToPrepend, containerNode.firstChild);
	                else
	                    containerNode.appendChild(nodeToPrepend);
	            } else {
	                // Start comments must always have a parent and at least one following sibling (the end comment)
	                containerNode.parentNode.insertBefore(nodeToPrepend, containerNode.nextSibling);
	            }
	        },

	        insertAfter: function(containerNode, nodeToInsert, insertAfterNode) {
	            if (!insertAfterNode) {
	                ko.virtualElements.prepend(containerNode, nodeToInsert);
	            } else if (!isStartComment(containerNode)) {
	                // Insert after insertion point
	                if (insertAfterNode.nextSibling)
	                    containerNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
	                else
	                    containerNode.appendChild(nodeToInsert);
	            } else {
	                // Children of start comments must always have a parent and at least one following sibling (the end comment)
	                containerNode.parentNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
	            }
	        },

	        firstChild: function(node) {
	            if (!isStartComment(node))
	                return node.firstChild;
	            if (!node.nextSibling || isEndComment(node.nextSibling))
	                return null;
	            return node.nextSibling;
	        },

	        nextSibling: function(node) {
	            if (isStartComment(node))
	                node = getMatchingEndComment(node);
	            if (node.nextSibling && isEndComment(node.nextSibling))
	                return null;
	            return node.nextSibling;
	        },

	        virtualNodeBindingValue: function(node) {
	            var regexMatch = isStartComment(node);
	            return regexMatch ? regexMatch[1] : null;
	        },

	        normaliseVirtualElementDomStructure: function(elementVerified) {
	            // Workaround for https://github.com/SteveSanderson/knockout/issues/155
	            // (IE <= 8 or IE 9 quirks mode parses your HTML weirdly, treating closing </li> tags as if they don't exist, thereby moving comment nodes
	            // that are direct descendants of <ul> into the preceding <li>)
	            if (!htmlTagsWithOptionallyClosingChildren[ko.utils.tagNameLower(elementVerified)])
	                return;

	            // Scan immediate children to see if they contain unbalanced comment tags. If they do, those comment tags
	            // must be intended to appear *after* that child, so move them there.
	            var childNode = elementVerified.firstChild;
	            if (childNode) {
	                do {
	                    if (childNode.nodeType === 1) {
	                        var unbalancedTags = getUnbalancedChildTags(childNode);
	                        if (unbalancedTags) {
	                            // Fix up the DOM by moving the unbalanced tags to where they most likely were intended to be placed - *after* the child
	                            var nodeToInsertBefore = childNode.nextSibling;
	                            for (var i = 0; i < unbalancedTags.length; i++) {
	                                if (nodeToInsertBefore)
	                                    elementVerified.insertBefore(unbalancedTags[i], nodeToInsertBefore);
	                                else
	                                    elementVerified.appendChild(unbalancedTags[i]);
	                            }
	                        }
	                    }
	                } while (childNode = childNode.nextSibling);
	            }
	        }
	    };
	})();
	ko.exportSymbol('virtualElements', ko.virtualElements);
	ko.exportSymbol('virtualElements.allowedBindings', ko.virtualElements.allowedBindings);
	ko.exportSymbol('virtualElements.emptyNode', ko.virtualElements.emptyNode);
	//ko.exportSymbol('virtualElements.firstChild', ko.virtualElements.firstChild);     // firstChild is not minified
	ko.exportSymbol('virtualElements.insertAfter', ko.virtualElements.insertAfter);
	//ko.exportSymbol('virtualElements.nextSibling', ko.virtualElements.nextSibling);   // nextSibling is not minified
	ko.exportSymbol('virtualElements.prepend', ko.virtualElements.prepend);
	ko.exportSymbol('virtualElements.setDomNodeChildren', ko.virtualElements.setDomNodeChildren);
	(function() {
	    var defaultBindingAttributeName = "data-bind";

	    ko.bindingProvider = function() {
	        this.bindingCache = {};
	    };

	    ko.utils.extend(ko.bindingProvider.prototype, {
	        'nodeHasBindings': function(node) {
	            switch (node.nodeType) {
	                case 1: return node.getAttribute(defaultBindingAttributeName) != null;   // Element
	                case 8: return ko.virtualElements.virtualNodeBindingValue(node) != null; // Comment node
	                default: return false;
	            }
	        },

	        'getBindings': function(node, bindingContext) {
	            var bindingsString = this['getBindingsString'](node, bindingContext);
	            return bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node) : null;
	        },

	        // The following function is only used internally by this default provider.
	        // It's not part of the interface definition for a general binding provider.
	        'getBindingsString': function(node, bindingContext) {
	            switch (node.nodeType) {
	                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
	                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
	                default: return null;
	            }
	        },

	        // The following function is only used internally by this default provider.
	        // It's not part of the interface definition for a general binding provider.
	        'parseBindingsString': function(bindingsString, bindingContext, node) {
	            try {
	                var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString, this.bindingCache);
	                return bindingFunction(bindingContext, node);
	            } catch (ex) {
	                ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString + "\nMessage: " + ex.message;
	                throw ex;
	            }
	        }
	    });

	    ko.bindingProvider['instance'] = new ko.bindingProvider();

	    function createBindingsStringEvaluatorViaCache(bindingsString, cache) {
	        var cacheKey = bindingsString;
	        return cache[cacheKey]
	            || (cache[cacheKey] = createBindingsStringEvaluator(bindingsString));
	    }

	    function createBindingsStringEvaluator(bindingsString) {
	        // Build the source for a function that evaluates "expression"
	        // For each scope variable, add an extra level of "with" nesting
	        // Example result: with(sc1) { with(sc0) { return (expression) } }
	        var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString),
	            functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
	        return new Function("$context", "$element", functionBody);
	    }
	})();

	ko.exportSymbol('bindingProvider', ko.bindingProvider);
	(function () {
	    ko.bindingHandlers = {};

	    ko.bindingContext = function(dataItem, parentBindingContext, dataItemAlias) {
	        if (parentBindingContext) {
	            ko.utils.extend(this, parentBindingContext); // Inherit $root and any custom properties
	            this['$parentContext'] = parentBindingContext;
	            this['$parent'] = parentBindingContext['$data'];
	            this['$parents'] = (parentBindingContext['$parents'] || []).slice(0);
	            this['$parents'].unshift(this['$parent']);
	        } else {
	            this['$parents'] = [];
	            this['$root'] = dataItem;
	            // Export 'ko' in the binding context so it will be available in bindings and templates
	            // even if 'ko' isn't exported as a global, such as when using an AMD loader.
	            // See https://github.com/SteveSanderson/knockout/issues/490
	            this['ko'] = ko;
	        }
	        this['$data'] = dataItem;
	        if (dataItemAlias)
	            this[dataItemAlias] = dataItem;
	    }
	    ko.bindingContext.prototype['createChildContext'] = function (dataItem, dataItemAlias) {
	        return new ko.bindingContext(dataItem, this, dataItemAlias);
	    };
	    ko.bindingContext.prototype['extend'] = function(properties) {
	        var clone = ko.utils.extend(new ko.bindingContext(), this);
	        return ko.utils.extend(clone, properties);
	    };

	    function validateThatBindingIsAllowedForVirtualElements(bindingName) {
	        var validator = ko.virtualElements.allowedBindings[bindingName];
	        if (!validator)
	            throw new Error("The binding '" + bindingName + "' cannot be used with virtual elements")
	    }

	    function applyBindingsToDescendantsInternal (viewModel, elementOrVirtualElement, bindingContextsMayDifferFromDomParentElement) {
	        var currentChild, nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);
	        while (currentChild = nextInQueue) {
	            // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
	            nextInQueue = ko.virtualElements.nextSibling(currentChild);
	            applyBindingsToNodeAndDescendantsInternal(viewModel, currentChild, bindingContextsMayDifferFromDomParentElement);
	        }
	    }

	    function applyBindingsToNodeAndDescendantsInternal (viewModel, nodeVerified, bindingContextMayDifferFromDomParentElement) {
	        var shouldBindDescendants = true;

	        // Perf optimisation: Apply bindings only if...
	        // (1) We need to store the binding context on this node (because it may differ from the DOM parent node's binding context)
	        //     Note that we can't store binding contexts on non-elements (e.g., text nodes), as IE doesn't allow expando properties for those
	        // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
	        var isElement = (nodeVerified.nodeType === 1);
	        if (isElement) // Workaround IE <= 8 HTML parsing weirdness
	            ko.virtualElements.normaliseVirtualElementDomStructure(nodeVerified);

	        var shouldApplyBindings = (isElement && bindingContextMayDifferFromDomParentElement)             // Case (1)
	                               || ko.bindingProvider['instance']['nodeHasBindings'](nodeVerified);       // Case (2)
	        if (shouldApplyBindings)
	            shouldBindDescendants = applyBindingsToNodeInternal(nodeVerified, null, viewModel, bindingContextMayDifferFromDomParentElement).shouldBindDescendants;

	        if (shouldBindDescendants) {
	            // We're recursing automatically into (real or virtual) child nodes without changing binding contexts. So,
	            //  * For children of a *real* element, the binding context is certainly the same as on their DOM .parentNode,
	            //    hence bindingContextsMayDifferFromDomParentElement is false
	            //  * For children of a *virtual* element, we can't be sure. Evaluating .parentNode on those children may
	            //    skip over any number of intermediate virtual elements, any of which might define a custom binding context,
	            //    hence bindingContextsMayDifferFromDomParentElement is true
	            applyBindingsToDescendantsInternal(viewModel, nodeVerified, /* bindingContextsMayDifferFromDomParentElement: */ !isElement);
	        }
	    }

	    var boundElementDomDataKey = '__ko_boundElement';
	    function applyBindingsToNodeInternal (node, bindings, viewModelOrBindingContext, bindingContextMayDifferFromDomParentElement) {
	        // Need to be sure that inits are only run once, and updates never run until all the inits have been run
	        var initPhase = 0; // 0 = before all inits, 1 = during inits, 2 = after all inits

	        // Each time the dependentObservable is evaluated (after data changes),
	        // the binding attribute is reparsed so that it can pick out the correct
	        // model properties in the context of the changed data.
	        // DOM event callbacks need to be able to access this changed data,
	        // so we need a single parsedBindings variable (shared by all callbacks
	        // associated with this node's bindings) that all the closures can access.
	        var parsedBindings;
	        function makeValueAccessor(bindingKey) {
	            return function () { return parsedBindings[bindingKey] }
	        }
	        function parsedBindingsAccessor() {
	            return parsedBindings;
	        }

	        var bindingHandlerThatControlsDescendantBindings;

	        // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
	        var alreadyBound = ko.utils.domData.get(node, boundElementDomDataKey);
	        if (!bindings) {
	            if (alreadyBound) {
	                throw Error("You cannot apply bindings multiple times to the same element.");
	            }
	            ko.utils.domData.set(node, boundElementDomDataKey, true);
	        }

	        ko.dependentObservable(
	            function () {
	                // Ensure we have a nonnull binding context to work with
	                var bindingContextInstance = viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
	                    ? viewModelOrBindingContext
	                    : new ko.bindingContext(ko.utils.unwrapObservable(viewModelOrBindingContext));
	                var viewModel = bindingContextInstance['$data'];

	                // Optimization: Don't store the binding context on this node if it's definitely the same as on node.parentNode, because
	                // we can easily recover it just by scanning up the node's ancestors in the DOM
	                // (note: here, parent node means "real DOM parent" not "virtual parent", as there's no O(1) way to find the virtual parent)
	                if (!alreadyBound && bindingContextMayDifferFromDomParentElement)
	                    ko.storedBindingContextForNode(node, bindingContextInstance);

	                // Use evaluatedBindings if given, otherwise fall back on asking the bindings provider to give us some bindings
	                var evaluatedBindings = (typeof bindings == "function") ? bindings(bindingContextInstance, node) : bindings;
	                parsedBindings = evaluatedBindings || ko.bindingProvider['instance']['getBindings'](node, bindingContextInstance);

	                if (parsedBindings) {
	                    // First run all the inits, so bindings can register for notification on changes
	                    if (initPhase === 0) {
	                        initPhase = 1;
	                        ko.utils.objectForEach(parsedBindings, function(bindingKey) {
	                            var binding = ko.bindingHandlers[bindingKey];
	                            if (binding && node.nodeType === 8)
	                                validateThatBindingIsAllowedForVirtualElements(bindingKey);

	                            if (binding && typeof binding["init"] == "function") {
	                                var handlerInitFn = binding["init"];
	                                var initResult = handlerInitFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);

	                                // If this binding handler claims to control descendant bindings, make a note of this
	                                if (initResult && initResult['controlsDescendantBindings']) {
	                                    if (bindingHandlerThatControlsDescendantBindings !== undefined)
	                                        throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
	                                    bindingHandlerThatControlsDescendantBindings = bindingKey;
	                                }
	                            }
	                        });
	                        initPhase = 2;
	                    }

	                    // ... then run all the updates, which might trigger changes even on the first evaluation
	                    if (initPhase === 2) {
	                        ko.utils.objectForEach(parsedBindings, function(bindingKey) {
	                            var binding = ko.bindingHandlers[bindingKey];
	                            if (binding && typeof binding["update"] == "function") {
	                                var handlerUpdateFn = binding["update"];
	                                handlerUpdateFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);
	                            }
	                        });
	                    }
	                }
	            },
	            null,
	            { disposeWhenNodeIsRemoved : node }
	        );

	        return {
	            shouldBindDescendants: bindingHandlerThatControlsDescendantBindings === undefined
	        };
	    };

	    var storedBindingContextDomDataKey = "__ko_bindingContext__";
	    ko.storedBindingContextForNode = function (node, bindingContext) {
	        if (arguments.length == 2)
	            ko.utils.domData.set(node, storedBindingContextDomDataKey, bindingContext);
	        else
	            return ko.utils.domData.get(node, storedBindingContextDomDataKey);
	    }

	    ko.applyBindingsToNode = function (node, bindings, viewModel) {
	        if (node.nodeType === 1) // If it's an element, workaround IE <= 8 HTML parsing weirdness
	            ko.virtualElements.normaliseVirtualElementDomStructure(node);
	        return applyBindingsToNodeInternal(node, bindings, viewModel, true);
	    };

	    ko.applyBindingsToDescendants = function(viewModel, rootNode) {
	        if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
	            applyBindingsToDescendantsInternal(viewModel, rootNode, true);
	    };

	    ko.applyBindings = function (viewModel, rootNode) {
	        if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8))
	            throw new Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
	        rootNode = rootNode || window.document.body; // Make "rootNode" parameter optional

	        applyBindingsToNodeAndDescendantsInternal(viewModel, rootNode, true);
	    };

	    // Retrieving binding context from arbitrary nodes
	    ko.contextFor = function(node) {
	        // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
	        switch (node.nodeType) {
	            case 1:
	            case 8:
	                var context = ko.storedBindingContextForNode(node);
	                if (context) return context;
	                if (node.parentNode) return ko.contextFor(node.parentNode);
	                break;
	        }
	        return undefined;
	    };
	    ko.dataFor = function(node) {
	        var context = ko.contextFor(node);
	        return context ? context['$data'] : undefined;
	    };

	    ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
	    ko.exportSymbol('applyBindings', ko.applyBindings);
	    ko.exportSymbol('applyBindingsToDescendants', ko.applyBindingsToDescendants);
	    ko.exportSymbol('applyBindingsToNode', ko.applyBindingsToNode);
	    ko.exportSymbol('contextFor', ko.contextFor);
	    ko.exportSymbol('dataFor', ko.dataFor);
	})();
	var attrHtmlToJavascriptMap = { 'class': 'className', 'for': 'htmlFor' };
	ko.bindingHandlers['attr'] = {
	    'update': function(element, valueAccessor, allBindingsAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
	        ko.utils.objectForEach(value, function(attrName, attrValue) {
	            attrValue = ko.utils.unwrapObservable(attrValue);

	            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
	            // when someProp is a "no value"-like value (strictly null, false, or undefined)
	            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
	            var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
	            if (toRemove)
	                element.removeAttribute(attrName);

	            // In IE <= 7 and IE8 Quirks Mode, you have to use the Javascript property name instead of the
	            // HTML attribute name for certain attributes. IE8 Standards Mode supports the correct behavior,
	            // but instead of figuring out the mode, we'll just set the attribute through the Javascript
	            // property for IE <= 8.
	            if (ko.utils.ieVersion <= 8 && attrName in attrHtmlToJavascriptMap) {
	                attrName = attrHtmlToJavascriptMap[attrName];
	                if (toRemove)
	                    element.removeAttribute(attrName);
	                else
	                    element[attrName] = attrValue;
	            } else if (!toRemove) {
	                element.setAttribute(attrName, attrValue.toString());
	            }

	            // Treat "name" specially - although you can think of it as an attribute, it also needs
	            // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
	            // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
	            // entirely, and there's no strong reason to allow for such casing in HTML.
	            if (attrName === "name") {
	                ko.utils.setElementName(element, toRemove ? "" : attrValue.toString());
	            }
	        });
	    }
	};
	ko.bindingHandlers['checked'] = {
	    'init': function (element, valueAccessor, allBindingsAccessor) {
	        var updateHandler = function() {
	            var valueToWrite;
	            if (element.type == "checkbox") {
	                valueToWrite = element.checked;
	            } else if ((element.type == "radio") && (element.checked)) {
	                valueToWrite = element.value;
	            } else {
	                return; // "checked" binding only responds to checkboxes and selected radio buttons
	            }

	            var modelValue = valueAccessor(), unwrappedValue = ko.utils.unwrapObservable(modelValue);
	            if ((element.type == "checkbox") && (unwrappedValue instanceof Array)) {
	                // For checkboxes bound to an array, we add/remove the checkbox value to that array
	                // This works for both observable and non-observable arrays
	                var existingEntryIndex = ko.utils.arrayIndexOf(unwrappedValue, element.value);
	                if (element.checked && (existingEntryIndex < 0))
	                    modelValue.push(element.value);
	                else if ((!element.checked) && (existingEntryIndex >= 0))
	                    modelValue.splice(existingEntryIndex, 1);
	            } else {
	                ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'checked', valueToWrite, true);
	            }
	        };
	        ko.utils.registerEventHandler(element, "click", updateHandler);

	        // IE 6 won't allow radio buttons to be selected unless they have a name
	        if ((element.type == "radio") && !element.name)
	            ko.bindingHandlers['uniqueName']['init'](element, function() { return true });
	    },
	    'update': function (element, valueAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor());

	        if (element.type == "checkbox") {
	            if (value instanceof Array) {
	                // When bound to an array, the checkbox being checked represents its value being present in that array
	                element.checked = ko.utils.arrayIndexOf(value, element.value) >= 0;
	            } else {
	                // When bound to anything other value (not an array), the checkbox being checked represents the value being trueish
	                element.checked = value;
	            }
	        } else if (element.type == "radio") {
	            element.checked = (element.value == value);
	        }
	    }
	};
	var classesWrittenByBindingKey = '__ko__cssValue';
	ko.bindingHandlers['css'] = {
	    'update': function (element, valueAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor());
	        if (typeof value == "object") {
	            ko.utils.objectForEach(value, function(className, shouldHaveClass) {
	                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
	                ko.utils.toggleDomNodeCssClass(element, className, shouldHaveClass);
	            });
	        } else {
	            value = String(value || ''); // Make sure we don't try to store or set a non-string value
	            ko.utils.toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
	            element[classesWrittenByBindingKey] = value;
	            ko.utils.toggleDomNodeCssClass(element, value, true);
	        }
	    }
	};
	ko.bindingHandlers['enable'] = {
	    'update': function (element, valueAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor());
	        if (value && element.disabled)
	            element.removeAttribute("disabled");
	        else if ((!value) && (!element.disabled))
	            element.disabled = true;
	    }
	};

	ko.bindingHandlers['disable'] = {
	    'update': function (element, valueAccessor) {
	        ko.bindingHandlers['enable']['update'](element, function() { return !ko.utils.unwrapObservable(valueAccessor()) });
	    }
	};
	// For certain common events (currently just 'click'), allow a simplified data-binding syntax
	// e.g. click:handler instead of the usual full-length event:{click:handler}
	function makeEventHandlerShortcut(eventName) {
	    ko.bindingHandlers[eventName] = {
	        'init': function(element, valueAccessor, allBindingsAccessor, viewModel) {
	            var newValueAccessor = function () {
	                var result = {};
	                result[eventName] = valueAccessor();
	                return result;
	            };
	            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindingsAccessor, viewModel);
	        }
	    }
	}

	ko.bindingHandlers['event'] = {
	    'init' : function (element, valueAccessor, allBindingsAccessor, viewModel) {
	        var eventsToHandle = valueAccessor() || {};
	        ko.utils.objectForEach(eventsToHandle, function(eventName) {
	            if (typeof eventName == "string") {
	                ko.utils.registerEventHandler(element, eventName, function (event) {
	                    var handlerReturnValue;
	                    var handlerFunction = valueAccessor()[eventName];
	                    if (!handlerFunction)
	                        return;
	                    var allBindings = allBindingsAccessor();

	                    try {
	                        // Take all the event args, and prefix with the viewmodel
	                        var argsForHandler = ko.utils.makeArray(arguments);
	                        argsForHandler.unshift(viewModel);
	                        handlerReturnValue = handlerFunction.apply(viewModel, argsForHandler);
	                    } finally {
	                        if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
	                            if (event.preventDefault)
	                                event.preventDefault();
	                            else
	                                event.returnValue = false;
	                        }
	                    }

	                    var bubble = allBindings[eventName + 'Bubble'] !== false;
	                    if (!bubble) {
	                        event.cancelBubble = true;
	                        if (event.stopPropagation)
	                            event.stopPropagation();
	                    }
	                });
	            }
	        });
	    }
	};
	// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
	// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
	ko.bindingHandlers['foreach'] = {
	    makeTemplateValueAccessor: function(valueAccessor) {
	        return function() {
	            var modelValue = valueAccessor(),
	                unwrappedValue = ko.utils.peekObservable(modelValue);    // Unwrap without setting a dependency here

	            // If unwrappedValue is the array, pass in the wrapped value on its own
	            // The value will be unwrapped and tracked within the template binding
	            // (See https://github.com/SteveSanderson/knockout/issues/523)
	            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
	                return { 'foreach': modelValue, 'templateEngine': ko.nativeTemplateEngine.instance };

	            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
	            ko.utils.unwrapObservable(modelValue);
	            return {
	                'foreach': unwrappedValue['data'],
	                'as': unwrappedValue['as'],
	                'includeDestroyed': unwrappedValue['includeDestroyed'],
	                'afterAdd': unwrappedValue['afterAdd'],
	                'beforeRemove': unwrappedValue['beforeRemove'],
	                'afterRender': unwrappedValue['afterRender'],
	                'beforeMove': unwrappedValue['beforeMove'],
	                'afterMove': unwrappedValue['afterMove'],
	                'templateEngine': ko.nativeTemplateEngine.instance
	            };
	        };
	    },
	    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
	        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor));
	    },
	    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
	        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor), allBindingsAccessor, viewModel, bindingContext);
	    }
	};
	ko.expressionRewriting.bindingRewriteValidators['foreach'] = false; // Can't rewrite control flow bindings
	ko.virtualElements.allowedBindings['foreach'] = true;
	var hasfocusUpdatingProperty = '__ko_hasfocusUpdating';
	var hasfocusLastValue = '__ko_hasfocusLastValue';
	ko.bindingHandlers['hasfocus'] = {
	    'init': function(element, valueAccessor, allBindingsAccessor) {
	        var handleElementFocusChange = function(isFocused) {
	            // Where possible, ignore which event was raised and determine focus state using activeElement,
	            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
	            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
	            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
	            // from calling 'blur()' on the element when it loses focus.
	            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
	            element[hasfocusUpdatingProperty] = true;
	            var ownerDoc = element.ownerDocument;
	            if ("activeElement" in ownerDoc) {
	                isFocused = (ownerDoc.activeElement === element);
	            }
	            var modelValue = valueAccessor();
	            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'hasfocus', isFocused, true);

	            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
	            element[hasfocusLastValue] = isFocused;
	            element[hasfocusUpdatingProperty] = false;
	        };
	        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
	        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

	        ko.utils.registerEventHandler(element, "focus", handleElementFocusIn);
	        ko.utils.registerEventHandler(element, "focusin", handleElementFocusIn); // For IE
	        ko.utils.registerEventHandler(element, "blur",  handleElementFocusOut);
	        ko.utils.registerEventHandler(element, "focusout",  handleElementFocusOut); // For IE
	    },
	    'update': function(element, valueAccessor) {
	        var value = !!ko.utils.unwrapObservable(valueAccessor()); //force boolean to compare with last value
	        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
	            value ? element.focus() : element.blur();
	            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, value ? "focusin" : "focusout"]); // For IE, which doesn't reliably fire "focus" or "blur" events synchronously
	        }
	    }
	};

	ko.bindingHandlers['hasFocus'] = ko.bindingHandlers['hasfocus']; // Make "hasFocus" an alias
	ko.bindingHandlers['html'] = {
	    'init': function() {
	        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
	        return { 'controlsDescendantBindings': true };
	    },
	    'update': function (element, valueAccessor) {
	        // setHtml will unwrap the value if needed
	        ko.utils.setHtml(element, valueAccessor());
	    }
	};
	var withIfDomDataKey = '__ko_withIfBindingData';
	// Makes a binding like with or if
	function makeWithIfBinding(bindingKey, isWith, isNot, makeContextCallback) {
	    ko.bindingHandlers[bindingKey] = {
	        'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
	            ko.utils.domData.set(element, withIfDomDataKey, {});
	            return { 'controlsDescendantBindings': true };
	        },
	        'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
	            var withIfData = ko.utils.domData.get(element, withIfDomDataKey),
	                dataValue = ko.utils.unwrapObservable(valueAccessor()),
	                shouldDisplay = !isNot !== !dataValue, // equivalent to isNot ? !dataValue : !!dataValue
	                isFirstRender = !withIfData.savedNodes,
	                needsRefresh = isFirstRender || isWith || (shouldDisplay !== withIfData.didDisplayOnLastUpdate);

	            if (needsRefresh) {
	                if (isFirstRender) {
	                    withIfData.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
	                }

	                if (shouldDisplay) {
	                    if (!isFirstRender) {
	                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(withIfData.savedNodes));
	                    }
	                    ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
	                } else {
	                    ko.virtualElements.emptyNode(element);
	                }

	                withIfData.didDisplayOnLastUpdate = shouldDisplay;
	            }
	        }
	    };
	    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
	    ko.virtualElements.allowedBindings[bindingKey] = true;
	}

	// Construct the actual binding handlers
	makeWithIfBinding('if');
	makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
	makeWithIfBinding('with', true /* isWith */, false /* isNot */,
	    function(bindingContext, dataValue) {
	        return bindingContext['createChildContext'](dataValue);
	    }
	);
	function ensureDropdownSelectionIsConsistentWithModelValue(element, modelValue, preferModelValue) {
	    if (preferModelValue) {
	        if (modelValue !== ko.selectExtensions.readValue(element))
	            ko.selectExtensions.writeValue(element, modelValue);
	    }

	    // No matter which direction we're syncing in, we want the end result to be equality between dropdown value and model value.
	    // If they aren't equal, either we prefer the dropdown value, or the model value couldn't be represented, so either way,
	    // change the model value to match the dropdown.
	    if (modelValue !== ko.selectExtensions.readValue(element))
	        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
	};

	ko.bindingHandlers['options'] = {
	    'update': function (element, valueAccessor, allBindingsAccessor) {
	        if (ko.utils.tagNameLower(element) !== "select")
	            throw new Error("options binding applies only to SELECT elements");

	        var selectWasPreviouslyEmpty = element.length == 0;
	        var previousSelectedValues = ko.utils.arrayMap(ko.utils.arrayFilter(element.childNodes, function (node) {
	            return node.tagName && (ko.utils.tagNameLower(node) === "option") && node.selected;
	        }), function (node) {
	            return ko.selectExtensions.readValue(node) || node.innerText || node.textContent;
	        });
	        var previousScrollTop = element.scrollTop;

	        var value = ko.utils.unwrapObservable(valueAccessor());
	        var selectedValue = element.value;

	        // Remove all existing <option>s.
	        // Need to use .remove() rather than .removeChild() for <option>s otherwise IE behaves oddly (https://github.com/SteveSanderson/knockout/issues/134)
	        while (element.length > 0) {
	            ko.cleanNode(element.options[0]);
	            element.remove(0);
	        }

	        if (value) {
	            var allBindings = allBindingsAccessor(),
	                includeDestroyed = allBindings['optionsIncludeDestroyed'];

	            if (typeof value.length != "number")
	                value = [value];
	            if (allBindings['optionsCaption']) {
	                var option = document.createElement("option");
	                ko.utils.setHtml(option, allBindings['optionsCaption']);
	                ko.selectExtensions.writeValue(option, undefined);
	                element.appendChild(option);
	            }

	            for (var i = 0, j = value.length; i < j; i++) {
	                // Skip destroyed items
	                var arrayEntry = value[i];
	                if (arrayEntry && arrayEntry['_destroy'] && !includeDestroyed)
	                    continue;

	                var option = document.createElement("option");

	                function applyToObject(object, predicate, defaultValue) {
	                    var predicateType = typeof predicate;
	                    if (predicateType == "function")    // Given a function; run it against the data value
	                        return predicate(object);
	                    else if (predicateType == "string") // Given a string; treat it as a property name on the data value
	                        return object[predicate];
	                    else                                // Given no optionsText arg; use the data value itself
	                        return defaultValue;
	                }

	                // Apply a value to the option element
	                var optionValue = applyToObject(arrayEntry, allBindings['optionsValue'], arrayEntry);
	                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

	                // Apply some text to the option element
	                var optionText = applyToObject(arrayEntry, allBindings['optionsText'], optionValue);
	                ko.utils.setTextContent(option, optionText);

	                element.appendChild(option);
	            }

	            // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
	            // That's why we first added them without selection. Now it's time to set the selection.
	            var newOptions = element.getElementsByTagName("option");
	            var countSelectionsRetained = 0;
	            for (var i = 0, j = newOptions.length; i < j; i++) {
	                if (ko.utils.arrayIndexOf(previousSelectedValues, ko.selectExtensions.readValue(newOptions[i])) >= 0) {
	                    ko.utils.setOptionNodeSelectionState(newOptions[i], true);
	                    countSelectionsRetained++;
	                }
	            }

	            element.scrollTop = previousScrollTop;

	            if (selectWasPreviouslyEmpty && ('value' in allBindings)) {
	                // Ensure consistency between model value and selected option.
	                // If the dropdown is being populated for the first time here (or was otherwise previously empty),
	                // the dropdown selection state is meaningless, so we preserve the model value.
	                ensureDropdownSelectionIsConsistentWithModelValue(element, ko.utils.peekObservable(allBindings['value']), /* preferModelValue */ true);
	            }

	            // Workaround for IE9 bug
	            ko.utils.ensureSelectElementIsRenderedCorrectly(element);
	        }
	    }
	};
	ko.bindingHandlers['options'].optionValueDomDataKey = '__ko.optionValueDomData__';
	ko.bindingHandlers['selectedOptions'] = {
	    'init': function (element, valueAccessor, allBindingsAccessor) {
	        ko.utils.registerEventHandler(element, "change", function () {
	            var value = valueAccessor(), valueToWrite = [];
	            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
	                if (node.selected)
	                    valueToWrite.push(ko.selectExtensions.readValue(node));
	            });
	            ko.expressionRewriting.writeValueToProperty(value, allBindingsAccessor, 'selectedOptions', valueToWrite);
	        });
	    },
	    'update': function (element, valueAccessor) {
	        if (ko.utils.tagNameLower(element) != "select")
	            throw new Error("values binding applies only to SELECT elements");

	        var newValue = ko.utils.unwrapObservable(valueAccessor());
	        if (newValue && typeof newValue.length == "number") {
	            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
	                var isSelected = ko.utils.arrayIndexOf(newValue, ko.selectExtensions.readValue(node)) >= 0;
	                ko.utils.setOptionNodeSelectionState(node, isSelected);
	            });
	        }
	    }
	};
	ko.bindingHandlers['style'] = {
	    'update': function (element, valueAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor() || {});
	        ko.utils.objectForEach(value, function(styleName, styleValue) {
	            styleValue = ko.utils.unwrapObservable(styleValue);
	            element.style[styleName] = styleValue || ""; // Empty string removes the value, whereas null/undefined have no effect
	        });
	    }
	};
	ko.bindingHandlers['submit'] = {
	    'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
	        if (typeof valueAccessor() != "function")
	            throw new Error("The value for a submit binding must be a function");
	        ko.utils.registerEventHandler(element, "submit", function (event) {
	            var handlerReturnValue;
	            var value = valueAccessor();
	            try { handlerReturnValue = value.call(viewModel, element); }
	            finally {
	                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
	                    if (event.preventDefault)
	                        event.preventDefault();
	                    else
	                        event.returnValue = false;
	                }
	            }
	        });
	    }
	};
	ko.bindingHandlers['text'] = {
	    'update': function (element, valueAccessor) {
	        ko.utils.setTextContent(element, valueAccessor());
	    }
	};
	ko.virtualElements.allowedBindings['text'] = true;
	ko.bindingHandlers['uniqueName'] = {
	    'init': function (element, valueAccessor) {
	        if (valueAccessor()) {
	            var name = "ko_unique_" + (++ko.bindingHandlers['uniqueName'].currentIndex);
	            ko.utils.setElementName(element, name);
	        }
	    }
	};
	ko.bindingHandlers['uniqueName'].currentIndex = 0;
	ko.bindingHandlers['value'] = {
	    'init': function (element, valueAccessor, allBindingsAccessor) {
	        // Always catch "change" event; possibly other events too if asked
	        var eventsToCatch = ["change"];
	        var requestedEventsToCatch = allBindingsAccessor()["valueUpdate"];
	        var propertyChangedFired = false;
	        if (requestedEventsToCatch) {
	            if (typeof requestedEventsToCatch == "string") // Allow both individual event names, and arrays of event names
	                requestedEventsToCatch = [requestedEventsToCatch];
	            ko.utils.arrayPushAll(eventsToCatch, requestedEventsToCatch);
	            eventsToCatch = ko.utils.arrayGetDistinctValues(eventsToCatch);
	        }

	        var valueUpdateHandler = function() {
	            propertyChangedFired = false;
	            var modelValue = valueAccessor();
	            var elementValue = ko.selectExtensions.readValue(element);
	            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'value', elementValue);
	        }

	        // Workaround for https://github.com/SteveSanderson/knockout/issues/122
	        // IE doesn't fire "change" events on textboxes if the user selects a value from its autocomplete list
	        var ieAutoCompleteHackNeeded = ko.utils.ieVersion && element.tagName.toLowerCase() == "input" && element.type == "text"
	                                       && element.autocomplete != "off" && (!element.form || element.form.autocomplete != "off");
	        if (ieAutoCompleteHackNeeded && ko.utils.arrayIndexOf(eventsToCatch, "propertychange") == -1) {
	            ko.utils.registerEventHandler(element, "propertychange", function () { propertyChangedFired = true });
	            ko.utils.registerEventHandler(element, "blur", function() {
	                if (propertyChangedFired) {
	                    valueUpdateHandler();
	                }
	            });
	        }

	        ko.utils.arrayForEach(eventsToCatch, function(eventName) {
	            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
	            // This is useful, for example, to catch "keydown" events after the browser has updated the control
	            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
	            var handler = valueUpdateHandler;
	            if (ko.utils.stringStartsWith(eventName, "after")) {
	                handler = function() { setTimeout(valueUpdateHandler, 0) };
	                eventName = eventName.substring("after".length);
	            }
	            ko.utils.registerEventHandler(element, eventName, handler);
	        });
	    },
	    'update': function (element, valueAccessor) {
	        var valueIsSelectOption = ko.utils.tagNameLower(element) === "select";
	        var newValue = ko.utils.unwrapObservable(valueAccessor());
	        var elementValue = ko.selectExtensions.readValue(element);
	        var valueHasChanged = (newValue != elementValue);

	        // JavaScript's 0 == "" behavious is unfortunate here as it prevents writing 0 to an empty text box (loose equality suggests the values are the same).
	        // We don't want to do a strict equality comparison as that is more confusing for developers in certain cases, so we specifically special case 0 != "" here.
	        if ((newValue === 0) && (elementValue !== 0) && (elementValue !== "0"))
	            valueHasChanged = true;

	        if (valueHasChanged) {
	            var applyValueAction = function () { ko.selectExtensions.writeValue(element, newValue); };
	            applyValueAction();

	            // Workaround for IE6 bug: It won't reliably apply values to SELECT nodes during the same execution thread
	            // right after you've changed the set of OPTION nodes on it. So for that node type, we'll schedule a second thread
	            // to apply the value as well.
	            var alsoApplyAsynchronously = valueIsSelectOption;
	            if (alsoApplyAsynchronously)
	                setTimeout(applyValueAction, 0);
	        }

	        // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
	        // because you're not allowed to have a model value that disagrees with a visible UI selection.
	        if (valueIsSelectOption && (element.length > 0))
	            ensureDropdownSelectionIsConsistentWithModelValue(element, newValue, /* preferModelValue */ false);
	    }
	};
	ko.bindingHandlers['visible'] = {
	    'update': function (element, valueAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor());
	        var isCurrentlyVisible = !(element.style.display == "none");
	        if (value && !isCurrentlyVisible)
	            element.style.display = "";
	        else if ((!value) && isCurrentlyVisible)
	            element.style.display = "none";
	    }
	};
	// 'click' is just a shorthand for the usual full-length event:{click:handler}
	makeEventHandlerShortcut('click');
	// If you want to make a custom template engine,
	//
	// [1] Inherit from this class (like ko.nativeTemplateEngine does)
	// [2] Override 'renderTemplateSource', supplying a function with this signature:
	//
	//        function (templateSource, bindingContext, options) {
	//            // - templateSource.text() is the text of the template you should render
	//            // - bindingContext.$data is the data you should pass into the template
	//            //   - you might also want to make bindingContext.$parent, bindingContext.$parents,
	//            //     and bindingContext.$root available in the template too
	//            // - options gives you access to any other properties set on "data-bind: { template: options }"
	//            //
	//            // Return value: an array of DOM nodes
	//        }
	//
	// [3] Override 'createJavaScriptEvaluatorBlock', supplying a function with this signature:
	//
	//        function (script) {
	//            // Return value: Whatever syntax means "Evaluate the JavaScript statement 'script' and output the result"
	//            //               For example, the jquery.tmpl template engine converts 'someScript' to '${ someScript }'
	//        }
	//
	//     This is only necessary if you want to allow data-bind attributes to reference arbitrary template variables.
	//     If you don't want to allow that, you can set the property 'allowTemplateRewriting' to false (like ko.nativeTemplateEngine does)
	//     and then you don't need to override 'createJavaScriptEvaluatorBlock'.

	ko.templateEngine = function () { };

	ko.templateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options) {
	    throw new Error("Override renderTemplateSource");
	};

	ko.templateEngine.prototype['createJavaScriptEvaluatorBlock'] = function (script) {
	    throw new Error("Override createJavaScriptEvaluatorBlock");
	};

	ko.templateEngine.prototype['makeTemplateSource'] = function(template, templateDocument) {
	    // Named template
	    if (typeof template == "string") {
	        templateDocument = templateDocument || document;
	        var elem = templateDocument.getElementById(template);
	        if (!elem)
	            throw new Error("Cannot find template with ID " + template);
	        return new ko.templateSources.domElement(elem);
	    } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
	        // Anonymous template
	        return new ko.templateSources.anonymousTemplate(template);
	    } else
	        throw new Error("Unknown template type: " + template);
	};

	ko.templateEngine.prototype['renderTemplate'] = function (template, bindingContext, options, templateDocument) {
	    var templateSource = this['makeTemplateSource'](template, templateDocument);
	    return this['renderTemplateSource'](templateSource, bindingContext, options);
	};

	ko.templateEngine.prototype['isTemplateRewritten'] = function (template, templateDocument) {
	    // Skip rewriting if requested
	    if (this['allowTemplateRewriting'] === false)
	        return true;
	    return this['makeTemplateSource'](template, templateDocument)['data']("isRewritten");
	};

	ko.templateEngine.prototype['rewriteTemplate'] = function (template, rewriterCallback, templateDocument) {
	    var templateSource = this['makeTemplateSource'](template, templateDocument);
	    var rewritten = rewriterCallback(templateSource['text']());
	    templateSource['text'](rewritten);
	    templateSource['data']("isRewritten", true);
	};

	ko.exportSymbol('templateEngine', ko.templateEngine);

	ko.templateRewriting = (function () {
	    var memoizeDataBindingAttributeSyntaxRegex = /(<[a-z]+\d*(\s+(?!data-bind=)[a-z0-9\-]+(=(\"[^\"]*\"|\'[^\']*\'))?)*\s+)data-bind=(["'])([\s\S]*?)\5/gi;
	    var memoizeVirtualContainerBindingSyntaxRegex = /<!--\s*ko\b\s*([\s\S]*?)\s*-->/g;

	    function validateDataBindValuesForRewriting(keyValueArray) {
	        var allValidators = ko.expressionRewriting.bindingRewriteValidators;
	        for (var i = 0; i < keyValueArray.length; i++) {
	            var key = keyValueArray[i]['key'];
	            if (allValidators.hasOwnProperty(key)) {
	                var validator = allValidators[key];

	                if (typeof validator === "function") {
	                    var possibleErrorMessage = validator(keyValueArray[i]['value']);
	                    if (possibleErrorMessage)
	                        throw new Error(possibleErrorMessage);
	                } else if (!validator) {
	                    throw new Error("This template engine does not support the '" + key + "' binding within its templates");
	                }
	            }
	        }
	    }

	    function constructMemoizedTagReplacement(dataBindAttributeValue, tagToRetain, templateEngine) {
	        var dataBindKeyValueArray = ko.expressionRewriting.parseObjectLiteral(dataBindAttributeValue);
	        validateDataBindValuesForRewriting(dataBindKeyValueArray);
	        var rewrittenDataBindAttributeValue = ko.expressionRewriting.preProcessBindings(dataBindKeyValueArray);

	        // For no obvious reason, Opera fails to evaluate rewrittenDataBindAttributeValue unless it's wrapped in an additional
	        // anonymous function, even though Opera's built-in debugger can evaluate it anyway. No other browser requires this
	        // extra indirection.
	        var applyBindingsToNextSiblingScript =
	            "ko.__tr_ambtns(function($context,$element){return(function(){return{ " + rewrittenDataBindAttributeValue + " } })()})";
	        return templateEngine['createJavaScriptEvaluatorBlock'](applyBindingsToNextSiblingScript) + tagToRetain;
	    }

	    return {
	        ensureTemplateIsRewritten: function (template, templateEngine, templateDocument) {
	            if (!templateEngine['isTemplateRewritten'](template, templateDocument))
	                templateEngine['rewriteTemplate'](template, function (htmlString) {
	                    return ko.templateRewriting.memoizeBindingAttributeSyntax(htmlString, templateEngine);
	                }, templateDocument);
	        },

	        memoizeBindingAttributeSyntax: function (htmlString, templateEngine) {
	            return htmlString.replace(memoizeDataBindingAttributeSyntaxRegex, function () {
	                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[6], /* tagToRetain: */ arguments[1], templateEngine);
	            }).replace(memoizeVirtualContainerBindingSyntaxRegex, function() {
	                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[1], /* tagToRetain: */ "<!-- ko -->", templateEngine);
	            });
	        },

	        applyMemoizedBindingsToNextSibling: function (bindings) {
	            return ko.memoization.memoize(function (domNode, bindingContext) {
	                if (domNode.nextSibling)
	                    ko.applyBindingsToNode(domNode.nextSibling, bindings, bindingContext);
	            });
	        }
	    }
	})();


	// Exported only because it has to be referenced by string lookup from within rewritten template
	ko.exportSymbol('__tr_ambtns', ko.templateRewriting.applyMemoizedBindingsToNextSibling);
	(function() {
	    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
	    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
	    //
	    // Two are provided by default:
	    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
	    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
	    //                                           without reading/writing the actual element text content, since it will be overwritten
	    //                                           with the rendered template output.
	    // You can implement your own template source if you want to fetch/store templates somewhere other than in DOM elements.
	    // Template sources need to have the following functions:
	    //   text() 			- returns the template text from your storage location
	    //   text(value)		- writes the supplied template text to your storage location
	    //   data(key)			- reads values stored using data(key, value) - see below
	    //   data(key, value)	- associates "value" with this template and the key "key". Is used to store information like "isRewritten".
	    //
	    // Optionally, template sources can also have the following functions:
	    //   nodes()            - returns a DOM element containing the nodes of this template, where available
	    //   nodes(value)       - writes the given DOM element to your storage location
	    // If a DOM element is available for a given template source, template engines are encouraged to use it in preference over text()
	    // for improved speed. However, all templateSources must supply text() even if they don't supply nodes().
	    //
	    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
	    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

	    ko.templateSources = {};

	    // ---- ko.templateSources.domElement -----

	    ko.templateSources.domElement = function(element) {
	        this.domElement = element;
	    }

	    ko.templateSources.domElement.prototype['text'] = function(/* valueToWrite */) {
	        var tagNameLower = ko.utils.tagNameLower(this.domElement),
	            elemContentsProperty = tagNameLower === "script" ? "text"
	                                 : tagNameLower === "textarea" ? "value"
	                                 : "innerHTML";

	        if (arguments.length == 0) {
	            return this.domElement[elemContentsProperty];
	        } else {
	            var valueToWrite = arguments[0];
	            if (elemContentsProperty === "innerHTML")
	                ko.utils.setHtml(this.domElement, valueToWrite);
	            else
	                this.domElement[elemContentsProperty] = valueToWrite;
	        }
	    };

	    ko.templateSources.domElement.prototype['data'] = function(key /*, valueToWrite */) {
	        if (arguments.length === 1) {
	            return ko.utils.domData.get(this.domElement, "templateSourceData_" + key);
	        } else {
	            ko.utils.domData.set(this.domElement, "templateSourceData_" + key, arguments[1]);
	        }
	    };

	    // ---- ko.templateSources.anonymousTemplate -----
	    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
	    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
	    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.

	    var anonymousTemplatesDomDataKey = "__ko_anon_template__";
	    ko.templateSources.anonymousTemplate = function(element) {
	        this.domElement = element;
	    }
	    ko.templateSources.anonymousTemplate.prototype = new ko.templateSources.domElement();
	    ko.templateSources.anonymousTemplate.prototype.constructor = ko.templateSources.anonymousTemplate;
	    ko.templateSources.anonymousTemplate.prototype['text'] = function(/* valueToWrite */) {
	        if (arguments.length == 0) {
	            var templateData = ko.utils.domData.get(this.domElement, anonymousTemplatesDomDataKey) || {};
	            if (templateData.textData === undefined && templateData.containerData)
	                templateData.textData = templateData.containerData.innerHTML;
	            return templateData.textData;
	        } else {
	            var valueToWrite = arguments[0];
	            ko.utils.domData.set(this.domElement, anonymousTemplatesDomDataKey, {textData: valueToWrite});
	        }
	    };
	    ko.templateSources.domElement.prototype['nodes'] = function(/* valueToWrite */) {
	        if (arguments.length == 0) {
	            var templateData = ko.utils.domData.get(this.domElement, anonymousTemplatesDomDataKey) || {};
	            return templateData.containerData;
	        } else {
	            var valueToWrite = arguments[0];
	            ko.utils.domData.set(this.domElement, anonymousTemplatesDomDataKey, {containerData: valueToWrite});
	        }
	    };

	    ko.exportSymbol('templateSources', ko.templateSources);
	    ko.exportSymbol('templateSources.domElement', ko.templateSources.domElement);
	    ko.exportSymbol('templateSources.anonymousTemplate', ko.templateSources.anonymousTemplate);
	})();
	(function () {
	    var _templateEngine;
	    ko.setTemplateEngine = function (templateEngine) {
	        if ((templateEngine != undefined) && !(templateEngine instanceof ko.templateEngine))
	            throw new Error("templateEngine must inherit from ko.templateEngine");
	        _templateEngine = templateEngine;
	    }

	    function invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, action) {
	        var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
	        while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
	            nextInQueue = ko.virtualElements.nextSibling(node);
	            if (node.nodeType === 1 || node.nodeType === 8)
	                action(node);
	        }
	    }

	    function activateBindingsOnContinuousNodeArray(continuousNodeArray, bindingContext) {
	        // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
	        // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
	        // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
	        // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
	        // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

	        if (continuousNodeArray.length) {
	            var firstNode = continuousNodeArray[0], lastNode = continuousNodeArray[continuousNodeArray.length - 1];

	            // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
	            // whereas a regular applyBindings won't introduce new memoized nodes
	            invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, function(node) {
	                ko.applyBindings(bindingContext, node);
	            });
	            invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, function(node) {
	                ko.memoization.unmemoizeDomNodeAndDescendants(node, [bindingContext]);
	            });
	        }
	    }

	    function getFirstNodeFromPossibleArray(nodeOrNodeArray) {
	        return nodeOrNodeArray.nodeType ? nodeOrNodeArray
	                                        : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
	                                        : null;
	    }

	    function executeTemplate(targetNodeOrNodeArray, renderMode, template, bindingContext, options) {
	        options = options || {};
	        var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
	        var templateDocument = firstTargetNode && firstTargetNode.ownerDocument;
	        var templateEngineToUse = (options['templateEngine'] || _templateEngine);
	        ko.templateRewriting.ensureTemplateIsRewritten(template, templateEngineToUse, templateDocument);
	        var renderedNodesArray = templateEngineToUse['renderTemplate'](template, bindingContext, options, templateDocument);

	        // Loosely check result is an array of DOM nodes
	        if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
	            throw new Error("Template engine must return an array of DOM nodes");

	        var haveAddedNodesToParent = false;
	        switch (renderMode) {
	            case "replaceChildren":
	                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
	                haveAddedNodesToParent = true;
	                break;
	            case "replaceNode":
	                ko.utils.replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray);
	                haveAddedNodesToParent = true;
	                break;
	            case "ignoreTargetNode": break;
	            default:
	                throw new Error("Unknown renderMode: " + renderMode);
	        }

	        if (haveAddedNodesToParent) {
	            activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
	            if (options['afterRender'])
	                ko.dependencyDetection.ignore(options['afterRender'], null, [renderedNodesArray, bindingContext['$data']]);
	        }

	        return renderedNodesArray;
	    }

	    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
	        options = options || {};
	        if ((options['templateEngine'] || _templateEngine) == undefined)
	            throw new Error("Set a template engine before calling renderTemplate");
	        renderMode = renderMode || "replaceChildren";

	        if (targetNodeOrNodeArray) {
	            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

	            var whenToDispose = function () { return (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); }; // Passive disposal (on next evaluation)
	            var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode == "replaceNode") ? firstTargetNode.parentNode : firstTargetNode;

	            return ko.dependentObservable( // So the DOM is automatically updated when any dependency changes
	                function () {
	                    // Ensure we've got a proper binding context to work with
	                    var bindingContext = (dataOrBindingContext && (dataOrBindingContext instanceof ko.bindingContext))
	                        ? dataOrBindingContext
	                        : new ko.bindingContext(ko.utils.unwrapObservable(dataOrBindingContext));

	                    // Support selecting template as a function of the data being rendered
	                    var templateName = typeof(template) == 'function' ? template(bindingContext['$data'], bindingContext) : template;

	                    var renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);
	                    if (renderMode == "replaceNode") {
	                        targetNodeOrNodeArray = renderedNodesArray;
	                        firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
	                    }
	                },
	                null,
	                { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: activelyDisposeWhenNodeIsRemoved }
	            );
	        } else {
	            // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
	            return ko.memoization.memoize(function (domNode) {
	                ko.renderTemplate(template, dataOrBindingContext, options, domNode, "replaceNode");
	            });
	        }
	    };

	    ko.renderTemplateForEach = function (template, arrayOrObservableArray, options, targetNode, parentBindingContext) {
	        // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
	        // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
	        var arrayItemContext;

	        // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
	        var executeTemplateForArrayItem = function (arrayValue, index) {
	            // Support selecting template as a function of the data being rendered
	            arrayItemContext = parentBindingContext['createChildContext'](ko.utils.unwrapObservable(arrayValue), options['as']);
	            arrayItemContext['$index'] = index;
	            var templateName = typeof(template) == 'function' ? template(arrayValue, arrayItemContext) : template;
	            return executeTemplate(null, "ignoreTargetNode", templateName, arrayItemContext, options);
	        }

	        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
	        var activateBindingsCallback = function(arrayValue, addedNodesArray, index) {
	            activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);
	            if (options['afterRender'])
	                options['afterRender'](addedNodesArray, arrayValue);
	        };

	        return ko.dependentObservable(function () {
	            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
	            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
	                unwrappedArray = [unwrappedArray];

	            // Filter out any entries marked as destroyed
	            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
	                return options['includeDestroyed'] || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
	            });

	            // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
	            // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
	            ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, filteredArray, executeTemplateForArrayItem, options, activateBindingsCallback]);

	        }, null, { disposeWhenNodeIsRemoved: targetNode });
	    };

	    var templateComputedDomDataKey = '__ko__templateComputedDomDataKey__';
	    function disposeOldComputedAndStoreNewOne(element, newComputed) {
	        var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
	        if (oldComputed && (typeof(oldComputed.dispose) == 'function'))
	            oldComputed.dispose();
	        ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && newComputed.isActive()) ? newComputed : undefined);
	    }

	    ko.bindingHandlers['template'] = {
	        'init': function(element, valueAccessor) {
	            // Support anonymous templates
	            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
	            if ((typeof bindingValue != "string") && (!bindingValue['name']) && (element.nodeType == 1 || element.nodeType == 8)) {
	                // It's an anonymous template - store the element contents, then clear the element
	                var templateNodes = element.nodeType == 1 ? element.childNodes : ko.virtualElements.childNodes(element),
	                    container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
	                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
	            }
	            return { 'controlsDescendantBindings': true };
	        },
	        'update': function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
	            var templateName = ko.utils.unwrapObservable(valueAccessor()),
	                options = {},
	                shouldDisplay = true,
	                dataValue,
	                templateComputed = null;

	            if (typeof templateName != "string") {
	                options = templateName;
	                templateName = ko.utils.unwrapObservable(options['name']);

	                // Support "if"/"ifnot" conditions
	                if ('if' in options)
	                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
	                if (shouldDisplay && 'ifnot' in options)
	                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

	                dataValue = ko.utils.unwrapObservable(options['data']);
	            }

	            if ('foreach' in options) {
	                // Render once for each data point (treating data set as empty if shouldDisplay==false)
	                var dataArray = (shouldDisplay && options['foreach']) || [];
	                templateComputed = ko.renderTemplateForEach(templateName || element, dataArray, options, element, bindingContext);
	            } else if (!shouldDisplay) {
	                ko.virtualElements.emptyNode(element);
	            } else {
	                // Render once for this single data point (or use the viewModel if no data was provided)
	                var innerBindingContext = ('data' in options) ?
	                    bindingContext['createChildContext'](dataValue, options['as']) :  // Given an explitit 'data' value, we create a child binding context for it
	                    bindingContext;                                                        // Given no explicit 'data' value, we retain the same binding context
	                templateComputed = ko.renderTemplate(templateName || element, innerBindingContext, options, element);
	            }

	            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
	            disposeOldComputedAndStoreNewOne(element, templateComputed);
	        }
	    };

	    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
	    ko.expressionRewriting.bindingRewriteValidators['template'] = function(bindingValue) {
	        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

	        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
	            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

	        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
	            return null; // Named templates can be rewritten, so return "no error"
	        return "This template engine does not support anonymous templates nested within its templates";
	    };

	    ko.virtualElements.allowedBindings['template'] = true;
	})();

	ko.exportSymbol('setTemplateEngine', ko.setTemplateEngine);
	ko.exportSymbol('renderTemplate', ko.renderTemplate);

	ko.utils.compareArrays = (function () {
	    var statusNotInOld = 'added', statusNotInNew = 'deleted';

	    // Simple calculation based on Levenshtein distance.
	    function compareArrays(oldArray, newArray, dontLimitMoves) {
	        oldArray = oldArray || [];
	        newArray = newArray || [];

	        if (oldArray.length <= newArray.length)
	            return compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, dontLimitMoves);
	        else
	            return compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, dontLimitMoves);
	    }

	    function compareSmallArrayToBigArray(smlArray, bigArray, statusNotInSml, statusNotInBig, dontLimitMoves) {
	        var myMin = Math.min,
	            myMax = Math.max,
	            editDistanceMatrix = [],
	            smlIndex, smlIndexMax = smlArray.length,
	            bigIndex, bigIndexMax = bigArray.length,
	            compareRange = (bigIndexMax - smlIndexMax) || 1,
	            maxDistance = smlIndexMax + bigIndexMax + 1,
	            thisRow, lastRow,
	            bigIndexMaxForRow, bigIndexMinForRow;

	        for (smlIndex = 0; smlIndex <= smlIndexMax; smlIndex++) {
	            lastRow = thisRow;
	            editDistanceMatrix.push(thisRow = []);
	            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
	            bigIndexMinForRow = myMax(0, smlIndex - 1);
	            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
	                if (!bigIndex)
	                    thisRow[bigIndex] = smlIndex + 1;
	                else if (!smlIndex)  // Top row - transform empty array into new array via additions
	                    thisRow[bigIndex] = bigIndex + 1;
	                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
	                    thisRow[bigIndex] = lastRow[bigIndex - 1];                  // copy value (no edit)
	                else {
	                    var northDistance = lastRow[bigIndex] || maxDistance;       // not in big (deletion)
	                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
	                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
	                }
	            }
	        }

	        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
	        for (smlIndex = smlIndexMax, bigIndex = bigIndexMax; smlIndex || bigIndex;) {
	            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
	            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
	                notInSml.push(editScript[editScript.length] = {     // added
	                    'status': statusNotInSml,
	                    'value': bigArray[--bigIndex],
	                    'index': bigIndex });
	            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
	                notInBig.push(editScript[editScript.length] = {     // deleted
	                    'status': statusNotInBig,
	                    'value': smlArray[--smlIndex],
	                    'index': smlIndex });
	            } else {
	                editScript.push({
	                    'status': "retained",
	                    'value': bigArray[--bigIndex] });
	                --smlIndex;
	            }
	        }

	        if (notInSml.length && notInBig.length) {
	            // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
	            // smlIndexMax keeps the time complexity of this algorithm linear.
	            var limitFailedCompares = smlIndexMax * 10, failedCompares,
	                a, d, notInSmlItem, notInBigItem;
	            // Go through the items that have been added and deleted and try to find matches between them.
	            for (failedCompares = a = 0; (dontLimitMoves || failedCompares < limitFailedCompares) && (notInSmlItem = notInSml[a]); a++) {
	                for (d = 0; notInBigItem = notInBig[d]; d++) {
	                    if (notInSmlItem['value'] === notInBigItem['value']) {
	                        notInSmlItem['moved'] = notInBigItem['index'];
	                        notInBigItem['moved'] = notInSmlItem['index'];
	                        notInBig.splice(d,1);       // This item is marked as moved; so remove it from notInBig list
	                        failedCompares = d = 0;     // Reset failed compares count because we're checking for consecutive failures
	                        break;
	                    }
	                }
	                failedCompares += d;
	            }
	        }
	        return editScript.reverse();
	    }

	    return compareArrays;
	})();

	ko.exportSymbol('utils.compareArrays', ko.utils.compareArrays);

	(function () {
	    // Objective:
	    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
	    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
	    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
	    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
	    //   previously mapped - retain those nodes, and just insert/delete other ones

	    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
	    // You can use this, for example, to activate bindings on those nodes.

	    function fixUpNodesToBeMovedOrRemoved(contiguousNodeArray) {
	        // Before moving, deleting, or replacing a set of nodes that were previously outputted by the "map" function, we have to reconcile
	        // them against what is in the DOM right now. It may be that some of the nodes have already been removed from the document,
	        // or that new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
	        // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
	        // So, this function translates the old "map" output array into its best guess of what set of current DOM nodes should be removed.
	        //
	        // Rules:
	        //   [A] Any leading nodes that aren't in the document any more should be ignored
	        //       These most likely correspond to memoization nodes that were already removed during binding
	        //       See https://github.com/SteveSanderson/knockout/pull/440
	        //   [B] We want to output a contiguous series of nodes that are still in the document. So, ignore any nodes that
	        //       have already been removed, and include any nodes that have been inserted among the previous collection

	        // Rule [A]
	        while (contiguousNodeArray.length && !ko.utils.domNodeIsAttachedToDocument(contiguousNodeArray[0]))
	            contiguousNodeArray.splice(0, 1);

	        // Rule [B]
	        if (contiguousNodeArray.length > 1) {
	            // Build up the actual new contiguous node set
	            var current = contiguousNodeArray[0], last = contiguousNodeArray[contiguousNodeArray.length - 1], newContiguousSet = [current];
	            while (current !== last) {
	                current = current.nextSibling;
	                if (!current) // Won't happen, except if the developer has manually removed some DOM elements (then we're in an undefined scenario)
	                    return;
	                newContiguousSet.push(current);
	            }

	            // ... then mutate the input array to match this.
	            // (The following line replaces the contents of contiguousNodeArray with newContiguousSet)
	            Array.prototype.splice.apply(contiguousNodeArray, [0, contiguousNodeArray.length].concat(newContiguousSet));
	        }
	        return contiguousNodeArray;
	    }

	    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
	        // Map this array value inside a dependentObservable so we re-map when any dependency changes
	        var mappedNodes = [];
	        var dependentObservable = ko.dependentObservable(function() {
	            var newMappedNodes = mapping(valueToMap, index) || [];

	            // On subsequent evaluations, just replace the previously-inserted DOM nodes
	            if (mappedNodes.length > 0) {
	                ko.utils.replaceDomNodes(fixUpNodesToBeMovedOrRemoved(mappedNodes), newMappedNodes);
	                if (callbackAfterAddingNodes)
	                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
	            }

	            // Replace the contents of the mappedNodes array, thereby updating the record
	            // of which nodes would be deleted if valueToMap was itself later removed
	            mappedNodes.splice(0, mappedNodes.length);
	            ko.utils.arrayPushAll(mappedNodes, newMappedNodes);
	        }, null, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: function() { return !ko.utils.anyDomNodeIsAttachedToDocument(mappedNodes); } });
	        return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
	    }

	    var lastMappingResultDomDataKey = "setDomNodeChildrenFromArrayMapping_lastMappingResult";

	    ko.utils.setDomNodeChildrenFromArrayMapping = function (domNode, array, mapping, options, callbackAfterAddingNodes) {
	        // Compare the provided array against the previous one
	        array = array || [];
	        options = options || {};
	        var isFirstExecution = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) === undefined;
	        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) || [];
	        var lastArray = ko.utils.arrayMap(lastMappingResult, function (x) { return x.arrayEntry; });
	        var editScript = ko.utils.compareArrays(lastArray, array);

	        // Build the new mapping result
	        var newMappingResult = [];
	        var lastMappingResultIndex = 0;
	        var newMappingResultIndex = 0;

	        var nodesToDelete = [];
	        var itemsToProcess = [];
	        var itemsForBeforeRemoveCallbacks = [];
	        var itemsForMoveCallbacks = [];
	        var itemsForAfterAddCallbacks = [];
	        var mapData;

	        function itemMovedOrRetained(editScriptIndex, oldPosition) {
	            mapData = lastMappingResult[oldPosition];
	            if (newMappingResultIndex !== oldPosition)
	                itemsForMoveCallbacks[editScriptIndex] = mapData;
	            // Since updating the index might change the nodes, do so before calling fixUpNodesToBeMovedOrRemoved
	            mapData.indexObservable(newMappingResultIndex++);
	            fixUpNodesToBeMovedOrRemoved(mapData.mappedNodes);
	            newMappingResult.push(mapData);
	            itemsToProcess.push(mapData);
	        }

	        function callCallback(callback, items) {
	            if (callback) {
	                for (var i = 0, n = items.length; i < n; i++) {
	                    if (items[i]) {
	                        ko.utils.arrayForEach(items[i].mappedNodes, function(node) {
	                            callback(node, i, items[i].arrayEntry);
	                        });
	                    }
	                }
	            }
	        }

	        for (var i = 0, editScriptItem, movedIndex; editScriptItem = editScript[i]; i++) {
	            movedIndex = editScriptItem['moved'];
	            switch (editScriptItem['status']) {
	                case "deleted":
	                    if (movedIndex === undefined) {
	                        mapData = lastMappingResult[lastMappingResultIndex];

	                        // Stop tracking changes to the mapping for these nodes
	                        if (mapData.dependentObservable)
	                            mapData.dependentObservable.dispose();

	                        // Queue these nodes for later removal
	                        nodesToDelete.push.apply(nodesToDelete, fixUpNodesToBeMovedOrRemoved(mapData.mappedNodes));
	                        if (options['beforeRemove']) {
	                            itemsForBeforeRemoveCallbacks[i] = mapData;
	                            itemsToProcess.push(mapData);
	                        }
	                    }
	                    lastMappingResultIndex++;
	                    break;

	                case "retained":
	                    itemMovedOrRetained(i, lastMappingResultIndex++);
	                    break;

	                case "added":
	                    if (movedIndex !== undefined) {
	                        itemMovedOrRetained(i, movedIndex);
	                    } else {
	                        mapData = { arrayEntry: editScriptItem['value'], indexObservable: ko.observable(newMappingResultIndex++) };
	                        newMappingResult.push(mapData);
	                        itemsToProcess.push(mapData);
	                        if (!isFirstExecution)
	                            itemsForAfterAddCallbacks[i] = mapData;
	                    }
	                    break;
	            }
	        }

	        // Call beforeMove first before any changes have been made to the DOM
	        callCallback(options['beforeMove'], itemsForMoveCallbacks);

	        // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
	        ko.utils.arrayForEach(nodesToDelete, options['beforeRemove'] ? ko.cleanNode : ko.removeNode);

	        // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
	        for (var i = 0, nextNode = ko.virtualElements.firstChild(domNode), lastNode, node; mapData = itemsToProcess[i]; i++) {
	            // Get nodes for newly added items
	            if (!mapData.mappedNodes)
	                ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

	            // Put nodes in the right place if they aren't there already
	            for (var j = 0; node = mapData.mappedNodes[j]; nextNode = node.nextSibling, lastNode = node, j++) {
	                if (node !== nextNode)
	                    ko.virtualElements.insertAfter(domNode, node, lastNode);
	            }

	            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
	            if (!mapData.initialized && callbackAfterAddingNodes) {
	                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
	                mapData.initialized = true;
	            }
	        }

	        // If there's a beforeRemove callback, call it after reordering.
	        // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
	        // some sort of animation, which is why we first reorder the nodes that will be removed. If the
	        // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
	        // Perhaps we'll make that change in the future if this scenario becomes more common.
	        callCallback(options['beforeRemove'], itemsForBeforeRemoveCallbacks);

	        // Finally call afterMove and afterAdd callbacks
	        callCallback(options['afterMove'], itemsForMoveCallbacks);
	        callCallback(options['afterAdd'], itemsForAfterAddCallbacks);

	        // Store a copy of the array items we just considered so we can difference it next time
	        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);
	    }
	})();

	ko.exportSymbol('utils.setDomNodeChildrenFromArrayMapping', ko.utils.setDomNodeChildrenFromArrayMapping);
	ko.nativeTemplateEngine = function () {
	    this['allowTemplateRewriting'] = false;
	}

	ko.nativeTemplateEngine.prototype = new ko.templateEngine();
	ko.nativeTemplateEngine.prototype.constructor = ko.nativeTemplateEngine;
	ko.nativeTemplateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options) {
	    var useNodesIfAvailable = !(ko.utils.ieVersion < 9), // IE<9 cloneNode doesn't work properly
	        templateNodesFunc = useNodesIfAvailable ? templateSource['nodes'] : null,
	        templateNodes = templateNodesFunc ? templateSource['nodes']() : null;

	    if (templateNodes) {
	        return ko.utils.makeArray(templateNodes.cloneNode(true).childNodes);
	    } else {
	        var templateText = templateSource['text']();
	        return ko.utils.parseHtmlFragment(templateText);
	    }
	};

	ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();
	ko.setTemplateEngine(ko.nativeTemplateEngine.instance);

	ko.exportSymbol('nativeTemplateEngine', ko.nativeTemplateEngine);
	(function() {
	    ko.jqueryTmplTemplateEngine = function () {
	        // Detect which version of jquery-tmpl you're using. Unfortunately jquery-tmpl
	        // doesn't expose a version number, so we have to infer it.
	        // Note that as of Knockout 1.3, we only support jQuery.tmpl 1.0.0pre and later,
	        // which KO internally refers to as version "2", so older versions are no longer detected.
	        var jQueryTmplVersion = this.jQueryTmplVersion = (function() {
	            if ((typeof(jQuery) == "undefined") || !(jQuery['tmpl']))
	                return 0;
	            // Since it exposes no official version number, we use our own numbering system. To be updated as jquery-tmpl evolves.
	            try {
	                if (jQuery['tmpl']['tag']['tmpl']['open'].toString().indexOf('__') >= 0) {
	                    // Since 1.0.0pre, custom tags should append markup to an array called "__"
	                    return 2; // Final version of jquery.tmpl
	                }
	            } catch(ex) { /* Apparently not the version we were looking for */ }

	            return 1; // Any older version that we don't support
	        })();

	        function ensureHasReferencedJQueryTemplates() {
	            if (jQueryTmplVersion < 2)
	                throw new Error("Your version of jQuery.tmpl is too old. Please upgrade to jQuery.tmpl 1.0.0pre or later.");
	        }

	        function executeTemplate(compiledTemplate, data, jQueryTemplateOptions) {
	            return jQuery['tmpl'](compiledTemplate, data, jQueryTemplateOptions);
	        }

	        this['renderTemplateSource'] = function(templateSource, bindingContext, options) {
	            options = options || {};
	            ensureHasReferencedJQueryTemplates();

	            // Ensure we have stored a precompiled version of this template (don't want to reparse on every render)
	            var precompiled = templateSource['data']('precompiled');
	            if (!precompiled) {
	                var templateText = templateSource['text']() || "";
	                // Wrap in "with($whatever.koBindingContext) { ... }"
	                templateText = "{{ko_with $item.koBindingContext}}" + templateText + "{{/ko_with}}";

	                precompiled = jQuery['template'](null, templateText);
	                templateSource['data']('precompiled', precompiled);
	            }

	            var data = [bindingContext['$data']]; // Prewrap the data in an array to stop jquery.tmpl from trying to unwrap any arrays
	            var jQueryTemplateOptions = jQuery['extend']({ 'koBindingContext': bindingContext }, options['templateOptions']);

	            var resultNodes = executeTemplate(precompiled, data, jQueryTemplateOptions);
	            resultNodes['appendTo'](document.createElement("div")); // Using "appendTo" forces jQuery/jQuery.tmpl to perform necessary cleanup work

	            jQuery['fragments'] = {}; // Clear jQuery's fragment cache to avoid a memory leak after a large number of template renders
	            return resultNodes;
	        };

	        this['createJavaScriptEvaluatorBlock'] = function(script) {
	            return "{{ko_code ((function() { return " + script + " })()) }}";
	        };

	        this['addTemplate'] = function(templateName, templateMarkup) {
	            document.write("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "<" + "/script>");
	        };

	        if (jQueryTmplVersion > 0) {
	            jQuery['tmpl']['tag']['ko_code'] = {
	                open: "__.push($1 || '');"
	            };
	            jQuery['tmpl']['tag']['ko_with'] = {
	                open: "with($1) {",
	                close: "} "
	            };
	        }
	    };

	    ko.jqueryTmplTemplateEngine.prototype = new ko.templateEngine();
	    ko.jqueryTmplTemplateEngine.prototype.constructor = ko.jqueryTmplTemplateEngine;

	    // Use this one by default *only if jquery.tmpl is referenced*
	    var jqueryTmplTemplateEngineInstance = new ko.jqueryTmplTemplateEngine();
	    if (jqueryTmplTemplateEngineInstance.jQueryTmplVersion > 0)
	        ko.setTemplateEngine(jqueryTmplTemplateEngineInstance);

	    ko.exportSymbol('jqueryTmplTemplateEngine', ko.jqueryTmplTemplateEngine);
	})();
	});
	}());
	})();
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)(module)))

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }
/******/ ])