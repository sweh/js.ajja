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

	"use strict";

	  var $ = __webpack_require__(3);
	  var ko = __webpack_require__(13);
	  var jsontemplate = __webpack_require__(14);
	  var Class = __webpack_require__(5);
	  ko.mapping = __webpack_require__(4);
	  __webpack_require__(1);


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
	        html = __webpack_require__(2)("./" + template + '.pt');
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


/***/ },
/* 1 */
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
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./gocept_jsform_templates_boolean.pt": 6,
		"./gocept_jsform_templates_field_wrapper.pt": 7,
		"./gocept_jsform_templates_form.pt": 8,
		"./gocept_jsform_templates_multiselect.pt": 9,
		"./gocept_jsform_templates_object.pt": 10,
		"./gocept_jsform_templates_string.pt": 11,
		"./gocept_jsform_templates_text.pt": 12
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
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * bower-jquery
	 * http://github.amexpub.com/modules/bower-jquery
	 *
	 * Copyright (c) 2013 AmexPub. All rights reserved.
	 */

	module.exports = __webpack_require__(15);


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/*** IMPORTS FROM imports-loader ***/
	(function() {

	/// Knockout Mapping plugin v2.4.1
	/// (c) 2013 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
	/// License: MIT (http://www.opensource.org/licenses/mit-license.php)
	(function (factory) {
	    // Module systems magic dance.

	    if (true) {
	        // CommonJS or Node: hard-coded dependency on "knockout"
	        factory(__webpack_require__(13), exports);
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
	}.call({}));

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*** IMPORTS FROM imports-loader ***/
	(function() {

	/**
	 * Classy - classy classes for JavaScript
	 *
	 * :copyright: (c) 2011 by Armin Ronacher. 
	 * :license: BSD.
	 */
	!function (definition) {
	  if (typeof module != 'undefined' && module.exports) module.exports = definition()
	  else if (true) !(__WEBPACK_AMD_DEFINE_FACTORY__ = (definition), (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_RESULT__ = __WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)) : module.exports = __WEBPACK_AMD_DEFINE_FACTORY__))
	  else this.Class = definition()
	}(function (undefined) {
	  var
	    CLASSY_VERSION = '1.4',
	    context = this,
	    old = context.Class,
	    disable_constructor = false;

	  /* we check if $super is in use by a class if we can.  But first we have to
	     check if the JavaScript interpreter supports that.  This also matches
	     to false positives later, but that does not do any harm besides slightly
	     slowing calls down. */
	  var probe_super = (function(){$super();}).toString().indexOf('$super') > 0;
	  function usesSuper(obj) {
	    return !probe_super || /\B\$super\b/.test(obj.toString());
	  }

	  /* helper function to set the attribute of something to a value or
	     removes it if the value is undefined. */
	  function setOrUnset(obj, key, value) {
	    if (value === undefined)
	      delete obj[key];
	    else
	      obj[key] = value;
	  }

	  /* gets the own property of an object */
	  function getOwnProperty(obj, name) {
	    return Object.prototype.hasOwnProperty.call(obj, name)
	      ? obj[name] : undefined;
	  }

	  /* instanciate a class without calling the constructor */
	  function cheapNew(cls) {
	    disable_constructor = true;
	    var rv = new cls;
	    disable_constructor = false;
	    return rv;
	  }

	  /* the base class we export */
	  var Class = function() {};

	  /* restore the global Class name and pass it to a function.  This allows
	     different versions of the classy library to be used side by side and
	     in combination with other libraries. */
	  Class.$noConflict = function() {
	    try {
	      setOrUnset(context, 'Class', old);
	    }
	    catch (e) {
	      // fix for IE that does not support delete on window
	      context.Class = old;
	    }
	    return Class;
	  };

	  /* what version of classy are we using? */
	  Class.$classyVersion = CLASSY_VERSION;

	  /* extend functionality */
	  Class.$extend = function(properties) {
	    var super_prototype = this.prototype;

	    /* disable constructors and instanciate prototype.  Because the
	       prototype can't raise an exception when created, we are safe
	       without a try/finally here. */
	    var prototype = cheapNew(this);

	    /* copy all properties of the includes over if there are any */
	    if (properties.__include__)
	      for (var i = 0, n = properties.__include__.length; i != n; ++i) {
	        var mixin = properties.__include__[i];
	        for (var name in mixin) {
	          var value = getOwnProperty(mixin, name);
	          if (value !== undefined)
	            prototype[name] = mixin[name];
	        }
	      }
	 
	    /* copy class vars from the superclass */
	    properties.__classvars__ = properties.__classvars__ || {};
	    if (prototype.__classvars__)
	      for (var key in prototype.__classvars__)
	        if (!properties.__classvars__[key]) {
	          var value = getOwnProperty(prototype.__classvars__, key);
	          properties.__classvars__[key] = value;
	        }

	    /* copy all properties over to the new prototype */
	    for (var name in properties) {
	      var value = getOwnProperty(properties, name);
	      if (name === '__include__' ||
	          value === undefined)
	        continue;

	      prototype[name] = typeof value === 'function' && usesSuper(value) ?
	        (function(meth, name) {
	          return function() {
	            var old_super = getOwnProperty(this, '$super');
	            this.$super = super_prototype[name];
	            try {
	              return meth.apply(this, arguments);
	            }
	            finally {
	              setOrUnset(this, '$super', old_super);
	            }
	          };
	        })(value, name) : value
	    }

	    /* dummy constructor */
	    var rv = function() {
	      if (disable_constructor)
	        return;
	      var proper_this = context === this ? cheapNew(arguments.callee) : this;
	      if (proper_this.__init__)
	        proper_this.__init__.apply(proper_this, arguments);
	      proper_this.$class = rv;
	      return proper_this;
	    }

	    /* copy all class vars over of any */
	    for (var key in properties.__classvars__) {
	      var value = getOwnProperty(properties.__classvars__, key);
	      if (value !== undefined)
	        rv[key] = value;
	    }

	    /* copy prototype and constructor over, reattach $extend and
	       return the class */
	    rv.prototype = prototype;
	    rv.constructor = rv;
	    rv.$extend = Class.$extend;
	    rv.$withData = Class.$withData;
	    return rv;
	  };

	  /* instanciate with data functionality */
	  Class.$withData = function(data) {
	    var rv = cheapNew(this);
	    for (var key in data) {
	      var value = getOwnProperty(data, key);
	      if (value !== undefined)
	        rv[key] = value;
	    }
	    return rv;
	  };

	  /* export the class */
	  return Class;
	});}.call({}));

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<input type=\"checkbox\" name=\"{name}\" data-bind=\"checked: {name}\" />\n";

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<div class=\"field\" id=\"field-{id}\">\n    <label for=\"{name}\">{label}</label>\n    <div class=\"error\"></div>\n    {widget_code|raw}\n</div>\n";

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<form method=\"POST\" action=\"{action}\" id=\"{form_id}\" class=\"jsform\">\n<div class=\"statusarea\"></div>\n</form>\n";

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<select name=\"{name}\"\n        multiple\n        data-bind=\"selectedOptions: {name}\">\n<option></option>\n{. repeated section source}\n  <option value=\"{token}\">{title}</option>\n{.end}\n</select>\n";

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<select name=\"{name}\"\n        data-bind=\"value: {name}\">\n  <option></option>\n{. repeated section source}\n  <option value=\"{token}\">{title}</option>\n{.end}\n</select>\n";

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<input type=\"text\" data-bind=\"value: {name}\" name=\"{name}\" value=\"\" />\n";

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<textarea data-bind=\"value: {name}\" name=\"{name}\"></textarea>\n";

/***/ },
/* 13 */
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
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)(module)))

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	/*** IMPORTS FROM imports-loader ***/
	var exports = {};

	// Copyright (C) 2009 Andy Chu
	//
	// Licensed under the Apache License, Version 2.0 (the "License");
	// you may not use this file except in compliance with the License.
	// You may obtain a copy of the License at
	//
	//      http://www.apache.org/licenses/LICENSE-2.0
	//
	// Unless required by applicable law or agreed to in writing, software
	// distributed under the License is distributed on an "AS IS" BASIS,
	// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	// See the License for the specific language governing permissions and
	// limitations under the License.

	//
	// JavaScript implementation of json-template.
	//

	// This is predefined in tests, shouldn't be defined anywhere else.  TODO: Do
	// something nicer.
	var log = log || function() {};
	var repr = repr || function() {};


	// The "module" exported by this script is called "jsontemplate":

	var jsontemplate = function() {

	function Exception(name, message) {
	    this.name = name;
	    this.message = message;
	}
	Exception.prototype = new Error();

	// Regex escaping for metacharacters
	function EscapeMeta(meta) {
	  return meta.replace(/([\{\}\(\)\[\]\|\^\$\-\+\?])/g, '\\$1');
	}

	var token_re_cache = {};

	function _MakeTokenRegex(meta_left, meta_right) {
	  var key = meta_left + meta_right;
	  var regex = token_re_cache[key];
	  if (regex === undefined) {
	    var str = '(' + EscapeMeta(meta_left) + '.*?' + EscapeMeta(meta_right) +
	              '\n?)';
	    regex = new RegExp(str, 'g');
	  }
	  return regex;
	}

	//
	// Formatters
	//

	function HtmlEscape(s) {
	  return s.replace(/&/g,'&amp;').
	           replace(/>/g,'&gt;').
	           replace(/</g,'&lt;');
	}

	function HtmlTagEscape(s) {
	  return s.replace(/&/g,'&amp;').
	           replace(/>/g,'&gt;').
	           replace(/</g,'&lt;').
	           replace(/"/g,'&quot;');
	}

	// Default ToString can be changed
	function ToString(s) {
	  if (s === null) {
	    return 'null';
	  }
	  return s.toString();
	}

	// Formatter to pluralize words
	function _Pluralize(value, unused_context, args) {
	  var s, p;
	  switch (args.length) {
	    case 0:
	      s = ''; p = 's';
	      break;
	    case 1:
	      s = ''; p = args[0];
	      break;
	    case 2:
	      s = args[0]; p = args[1];
	      break;
	    default:
	      // Should have been checked at compile time
	      new Error('EvaluationError', 'pluralize got too many args');
	  }
	  return (value > 1) ? p : s;
	}

	function _Cycle(value, unused_context, args) {
	  // Cycle between various values on consecutive integers.
	  // @index starts from 1, so use 1-based indexing.
	  return args[(value - 1) % args.length];
	}

	var DEFAULT_FORMATTERS = {
	  'html': HtmlEscape,
	  'htmltag': HtmlTagEscape,
	  'html-attr-value': HtmlTagEscape,
	  'str': ToString,
	  'raw': function(x) { return x; },
	  'AbsUrl': function(value, context) {
	    // TODO: Normalize leading/trailing slashes
	    return context.get('base-url') + '/' + value;
	  },
	  'plain-url': function(x) {
	    return '<a href="' + HtmlTagEscape(x) + '">' + HtmlEscape(x) + '</a>' ;
	  }
	};

	var DEFAULT_PREDICATES = {
	  'singular?': function(x) { return  x == 1; },
	  'plural?': function(x) { return x > 1; },
	  'Debug?': function(unused, context) {
	    try {
	      return context.get('debug');
	    } catch(err) {
	      if (err.name == 'UndefinedVariable') {
	        return false;
	      } else {
	        throw err;
	      }
	    }
	  }
	};

	var FunctionRegistry = function() {
	  return {
	    lookup: function(user_str) {
	      return [null, null];
	    }
	  };
	};

	var SimpleRegistry = function(obj) {
	  return {
	    lookup: function(user_str) {
	      var func = obj[user_str] || null;
	      return [func, null];
	    }
	  };
	};

	var CallableRegistry = function(callable) {
	  return {
	    lookup: function(user_str) {
	      var func = callable(user_str);
	      return [func, null];
	    }
	  };
	};

	// Default formatters which can't be expressed in DEFAULT_FORMATTERS
	var PrefixRegistry = function(functions) {
	  return {
	    lookup: function(user_str) {
	      for (var i = 0; i < functions.length; i++) {
	        var name = functions[i].name, func = functions[i].func;
	        if (user_str.slice(0, name.length) == name) {
	          // Delimiter is usually a space, but could be something else
	          var args;
	          var splitchar = user_str.charAt(name.length);
	          if (splitchar === '') {
	            args = [];  // No arguments
	          } else {
	            args = user_str.split(splitchar).slice(1);
	          }
	          return [func, args];
	        } 
	      }
	      return [null, null];  // No formatter
	    }
	  };
	};

	var ChainedRegistry = function(registries) {
	  return {
	    lookup: function(user_str) {
	      for (var i=0; i<registries.length; i++) {
	        var result = registries[i].lookup(user_str);
	        if (result[0]) {
	          return result;
	        }
	      }
	      return [null, null];  // Nothing found
	    }
	  };
	};

	//
	// Template implementation
	//

	// Context wraps a data dictionary and makes it "walkable".
	function Context(context, undefined_str) {
	  // The stack contains:
	  //   The current context (an object).
	  //   An iteration index.  -1 means we're NOT iterating.
	  var stack = [{context: context, index: -1}];

	  return {
	    pushName: function(name) {
	      if (name === undefined || name === null) {
	        return null;
	      }
	      var new_context;
	      if (name == '@') {
	        new_context = stack[stack.length-1].context;
	      } else {
	        new_context = stack[stack.length-1].context[name] || null;
	      }
	      stack.push({context: new_context, index: -1});
	      return new_context;
	    },

	    pop: function() {
	      stack.pop();
	    },

	    next: function() {
	      var stacktop = stack[stack.length-1];

	      // Now we're iterating -- push a new mutable object onto the stack
	      if (stacktop.index == -1) {
	        stacktop = {context: null, index: 0};
	        stack.push(stacktop);
	      }

	      // The thing we're iterating over
	      var context_array = stack[stack.length-2].context;

	      // We're already done
	      if (stacktop.index == context_array.length) {
	        stack.pop();
	        return undefined;  // sentinel to say that we're done
	      }

	      stacktop.context = context_array[stacktop.index++];
	      return true;  // OK, we mutated the stack
	    },

	    _Undefined: function() {
	      return (undefined_str === undefined) ? undefined : undefined_str;
	    },

	    _LookUpStack: function(name) {
	      var i = stack.length - 1;
	      while (true) {
	        var frame = stack[i];
	        if (name == '@index') {
	          if (frame.index != -1) {  // -1 is undefined
	            return frame.index;
	          }
	        } else {
	          var context = frame.context;
	          if (typeof context === 'object') {
	            var value = context[name];
	            if (value !== undefined) {
	              return value;
	            }
	          }
	        }
	        i--;
	        if (i <= -1) {
	          return this._Undefined(name);
	        }
	      }
	    },

	    get: function(name) {
	      if (name == '@') {
	        return stack[stack.length-1].context;
	      }
	      var parts = name.split('.'),
	          value = this._LookUpStack(parts[0]);  // First lookup is special 
	      if (value === undefined) {
	        return this._Undefined();
	      }
	      for (var i=1; i<parts.length; i++) {
	        value = value[parts[i]];
	        if (value === undefined) {
	          return this._Undefined();
	        }
	      }
	      return value;
	    }

	  };
	}


	// Crockford's "functional inheritance" pattern

	var _AbstractSection = function(spec) {
	  var that = {};
	  that.current_clause = [];

	  that.Append = function(statement) {
	    that.current_clause.push(statement);
	  };

	  that.AlternatesWith = function() {
	    new Error('TemplateSyntaxError',
	      '{.alternates with} can only appear with in {.repeated section ...}');
	  };

	  that.NewOrClause = function(pred) {
	    throw new Exception('NotImplemented');  // "Abstract"
	  };

	  return that;
	};

	var _Section = function(spec) {
	  var that = _AbstractSection(spec);
	  that.statements = {'default': that.current_clause};

	  that.section_name = spec.section_name;

	  that.Statements = function(clause) {
	    clause = clause || 'default';
	    return that.statements[clause] || [];
	  };

	  that.NewOrClause = function(pred) {
	    if (pred) {
	      throw new Exception('TemplateSyntaxError',
	        '{.or} clause only takes a predicate inside predicate blocks');
	    }
	    that.current_clause = [];
	    that.statements['or'] = that.current_clause;
	  };

	  return that;
	};

	// Repeated section is like section, but it supports {.alternates with}
	var _RepeatedSection = function(spec) {
	  var that = _Section(spec);

	  that.AlternatesWith = function() {
	    that.current_clause = [];
	    that.statements['alternate'] = that.current_clause;
	  };

	  return that;
	};

	// Represents a sequence of predicate clauses.
	var _PredicateSection = function(spec) {
	  var that = _AbstractSection(spec);
	  // Array of func, statements
	  that.clauses = [];

	  that.NewOrClause = function(pred) {
	    // {.or} always executes if reached, so use identity func with no args
	    pred = pred || [function(x) { return true; }, null];
	    that.current_clause = [];
	    that.clauses.push([pred, that.current_clause]);
	  };

	  return that;
	};


	function _Execute(statements, context, callback) {
	  for (var i=0; i<statements.length; i++) {
	    var statement = statements[i];

	    if (typeof(statement) == 'string') {
	      callback(statement);
	    } else {
	      var func = statement[0];
	      var args = statement[1];
	      func(args, context, callback);
	    }
	  }
	}

	function _DoSubstitute(statement, context, callback) {
	  var value = context.get(statement.name);
	  if (value === undefined) {
	    throw new Exception('UndefinedVariable',
	      statement.name + ' is not defined');
	  }

	  // Format values
	  for (var i=0; i<statement.formatters.length; i++) {
	    var pair = statement.formatters[i];
	    var formatter = pair[0];
	    var args = pair[1];
	    value = formatter(value, context, args);
	  }

	  callback(value);
	}

	// for [section foo]
	function _DoSection(args, context, callback) {

	  var block = args;
	  var value = context.pushName(block.section_name);
	  var do_section = false;

	  // "truthy" values should have their sections executed.
	  if (value) {
	    do_section = true;
	  }
	  // Except: if the value is a zero-length array (which is "truthy")
	  if (value && value.length === 0) {
	    do_section = false;
	  }

	  if (do_section) {
	    _Execute(block.Statements(), context, callback);
	    context.pop();
	  } else {  // Empty list, None, False, etc.
	    context.pop();
	    _Execute(block.Statements('or'), context, callback);
	  }
	}

	// {.pred1?} A {.or pred2?} B ... {.or} Z {.end}
	function _DoPredicates(args, context, callback) {
	  // Here we execute the first clause that evaluates to true, and then stop.
	  var block = args;
	  var value = context.get('@');
	  for (var i=0; i<block.clauses.length; i++) {
	    var clause = block.clauses[i];
	    var predicate = clause[0][0];
	    var pred_args = clause[0][1];
	    var statements = clause[1];

	    var do_clause = predicate(value, context, pred_args);
	    if (do_clause) {
	      _Execute(statements, context, callback);
	      break;
	    }
	  }
	}


	function _DoRepeatedSection(args, context, callback) {
	  var block = args,
	      items = context.pushName(block.section_name),
	      pushed = true;

	  if (items && items.length > 0) {
	    // TODO: check that items is an array; apparently this is hard in JavaScript
	    //if type(items) is not list:
	    //  raise EvaluationError('Expected a list; got %s' % type(items))

	    // Execute the statements in the block for every item in the list.
	    // Execute the alternate block on every iteration except the last.  Each
	    // item could be an atom (string, integer, etc.) or a dictionary.
	    
	    var last_index = items.length - 1;
	    var statements = block.Statements();
	    var alt_statements = block.Statements('alternate');

	    for (var i=0; context.next() !== undefined; i++) {
	      _Execute(statements, context, callback);
	      if (i != last_index) {
	        _Execute(alt_statements, context, callback);
	      }
	    }
	  } else {
	    _Execute(block.Statements('or'), context, callback);
	  }

	  context.pop();
	}


	var _SECTION_RE = /(repeated)?\s*(section)\s+(\S+)?/;
	var _OR_RE = /or(?:\s+(.+))?/;
	var _IF_RE = /if(?:\s+(.+))?/;


	// Turn a object literal, function, or Registry into a Registry
	function MakeRegistry(obj) {
	  if (!obj) {
	    // if null/undefined, use a totally empty FunctionRegistry
	    return new FunctionRegistry();
	  } else if (typeof obj === 'function') {
	    return new CallableRegistry(obj);
	  } else if (obj.lookup !== undefined) {
	    // TODO: Is this a good pattern?  There is a namespace conflict where get
	    // could be either a formatter or a method on a FunctionRegistry.
	    // instanceof might be more robust.
	    return obj;
	  } else if (typeof obj === 'object') {
	    return new SimpleRegistry(obj);
	  }
	}

	// TODO: The compile function could be in a different module, in case we want to
	// compile on the server side.
	function _Compile(template_str, options) {
	  var more_formatters = MakeRegistry(options.more_formatters);

	  // default formatters with arguments
	  var default_formatters = PrefixRegistry([
	      {name: 'pluralize', func: _Pluralize},
	      {name: 'cycle', func: _Cycle}
	      ]);
	  var all_formatters = new ChainedRegistry([
	      more_formatters,
	      SimpleRegistry(DEFAULT_FORMATTERS),
	      default_formatters
	      ]);

	  var more_predicates = MakeRegistry(options.more_predicates);

	  // TODO: Add defaults
	  var all_predicates = new ChainedRegistry([
	      more_predicates, SimpleRegistry(DEFAULT_PREDICATES)
	      ]);

	  // We want to allow an explicit null value for default_formatter, which means
	  // that an error is raised if no formatter is specified.
	  var default_formatter;
	  if (options.default_formatter === undefined) {
	    default_formatter = 'str';
	  } else {
	    default_formatter = options.default_formatter;
	  }

	  function GetFormatter(format_str) {
	    var pair = all_formatters.lookup(format_str);
	    if (!pair[0]) {
	      throw new Exception('BadFormatter',
	        format_str + ' is not a valid formatter');
	    }
	    return pair;
	  }

	  function GetPredicate(pred_str) {
	    var pair = all_predicates.lookup(pred_str);
	    if (!pair[0]) {
	      throw new Exception('BadPredicate',
	        pred_str + ' is not a valid predicate');
	    }
	    return pair;
	  }

	  var format_char = options.format_char || '|';
	  if (format_char != ':' && format_char != '|') {
	    throw new Exception('ConfigurationError',
	      'Only format characters : and | are accepted');
	  }

	  var meta = options.meta || '{}';
	  var n = meta.length;
	  if (n % 2 == 1) {
	    throw new Exception('ConfigurationError',
	      meta + ' has an odd number of metacharacters');
	  }
	  var meta_left = meta.substring(0, n/2);
	  var meta_right = meta.substring(n/2, n);

	  var token_re = _MakeTokenRegex(meta_left, meta_right);
	  var current_block = _Section({});
	  var stack = [current_block];

	  var strip_num = meta_left.length;  // assume they're the same length

	  var token_match;
	  var last_index = 0;

	  while (true) {
	    token_match = token_re.exec(template_str);
	    if (token_match === null) {
	      break;
	    } else {
	      var token = token_match[0];
	    }

	    // Add the previous literal to the program
	    if (token_match.index > last_index) {
	      var tok = template_str.slice(last_index, token_match.index);
	      current_block.Append(tok);
	    }
	    last_index = token_re.lastIndex;

	    var had_newline = false;
	    if (token.slice(-1) == '\n') {
	      token = token.slice(null, -1);
	      had_newline = true;
	    }

	    token = token.slice(strip_num, -strip_num);

	    if (token.charAt(0) == '#') {
	      continue;  // comment
	    }

	    if (token.charAt(0) == '.') {  // Keyword
	      token = token.substring(1, token.length);

	      var literal = {
	          'meta-left': meta_left,
	          'meta-right': meta_right,
	          'space': ' ',
	          'tab': '\t',
	          'newline': '\n'
	          }[token];

	      if (literal !== undefined) {
	        current_block.Append(literal);
	        continue;
	      }

	      var new_block, func;

	      var section_match = token.match(_SECTION_RE);
	      if (section_match) {
	        var repeated = section_match[1];
	        var section_name = section_match[3];

	        if (repeated) {
	          func = _DoRepeatedSection;
	          new_block = _RepeatedSection({section_name: section_name});
	        } else {
	          func = _DoSection;
	          new_block = _Section({section_name: section_name});
	        }
	        current_block.Append([func, new_block]);
	        stack.push(new_block);
	        current_block = new_block;
	        continue;
	      }

	      var pred_str, pred;

	      // Check {.or pred?} before {.pred?}
	      var or_match = token.match(_OR_RE);
	      if (or_match) {
	        pred_str = or_match[1];
	        pred = pred_str ? GetPredicate(pred_str) : null;
	        current_block.NewOrClause(pred);
	        continue;
	      }

	      // Match either {.pred?} or {.if pred?}
	      var matched = false;

	      var if_match = token.match(_IF_RE);
	      if (if_match) {
	        pred_str = if_match[1];
	        matched = true;
	      } else if (token.charAt(token.length-1) == '?') {
	        pred_str = token;
	        matched = true;
	      }
	      if (matched) {
	        pred = pred_str ? GetPredicate(pred_str) : null;
	        new_block = _PredicateSection();
	        new_block.NewOrClause(pred);
	        current_block.Append([_DoPredicates, new_block]);
	        stack.push(new_block);
	        current_block = new_block;
	        continue;
	      }

	      if (token == 'alternates with') {
	        current_block.AlternatesWith();
	        continue;
	      }

	      if (token == 'end') {
	        // End the block
	        stack.pop();
	        if (stack.length > 0) {
	          current_block = stack[stack.length-1];
	        } else {
	          throw new Exception('TemplateSyntaxError',
	            'Got too many {end} statements');
	        }
	        continue;
	      }
	    }

	    // A variable substitution
	    var parts = token.split(format_char);
	    var formatters;
	    var name;
	    if (parts.length == 1) {
	      if (default_formatter === null) {
	          throw new Exception('MissingFormatter',
	            'This template requires explicit formatters.');
	      }
	      // If no formatter is specified, use the default.
	      formatters = [GetFormatter(default_formatter)];
	      name = token;
	    } else {
	      formatters = [];
	      for (var j=1; j<parts.length; j++) {
	        formatters.push(GetFormatter(parts[j]));
	      }
	      name = parts[0];
	    }
	    current_block.Append([_DoSubstitute, {name: name, formatters: formatters}]);
	    if (had_newline) {
	      current_block.Append('\n');
	    }
	  }

	  // Add the trailing literal
	  current_block.Append(template_str.slice(last_index));

	  if (stack.length !== 1) {
	    throw new Exception('TemplateSyntaxError',
	      'Got too few {end} statements');
	  }
	  return current_block;
	}

	// The Template class is defined in the traditional style so that users can add
	// methods by mutating the prototype attribute.  TODO: Need a good idiom for
	// inheritance without mutating globals.

	function Template(template_str, options) {

	  // Add 'new' if we were not called with 'new', so prototyping works.
	  if(!(this instanceof Template)) {
	    return new Template(template_str, options);
	  }

	  this._options = options || {};
	  this._program = _Compile(template_str, this._options);
	}

	Template.prototype.render = function(context, callback) {
	  // If it has a .get() method already, assume it's already a context object we
	  // can use.
	  if (typeof context.get !== 'function') {
	    // options.undefined_str can either be a string or undefined
	    context = Context(context, this._options.undefined_str);
	  }
	  _Execute(this._program.Statements(), context, callback);
	};

	Template.prototype.expand = function(data_dict) {
	  var tokens = [];
	  this.render(data_dict, function(x) { tokens.push(x); });
	  return tokens.join('');
	};

	// fromString is a construction method that allows metadata to be written at the
	// beginning of the template string.  See Python's FromFile for a detailed
	// description of the format.
	//
	// The argument 'options' takes precedence over the options in the template, and
	// can be used for non-serializable options like template formatters.

	var OPTION_RE = /^([a-zA-Z\-]+):\s*(.*)/;
	var OPTION_NAMES = [
	    'meta', 'format-char', 'default-formatter', 'undefined-str'];
	// Use this "linear search" instead of Array.indexOf, which is nonstandard
	var OPTION_NAMES_RE = new RegExp(OPTION_NAMES.join('|'));

	function fromString(s, options) {
	  var parsed = {},
	      begin = 0, end = 0,
	      parsedAny = false;

	  while (true) {
	    var parsedOption = false;
	    end = s.indexOf('\n', begin);
	    if (end == -1) {
	      break;
	    }
	    var line = s.slice(begin, end);
	    begin = end+1;
	    var match = line.match(OPTION_RE);
	    if (match !== null) {
	      var name = match[1].toLowerCase(), value = match[2];
	      if (name.match(OPTION_NAMES_RE)) {
	        name = name.replace('-', '_');
	        value = value.replace(/^\s+/, '').replace(/\s+$/, '');
	        if (name == 'default_formatter' && value.toLowerCase() == 'none') {
	          value = null;
	        }
	        parsed[name] = value;
	        parsedOption = true;
	        parsedAny = true;
	      }
	    }
	    if (!parsedOption) {
	      break;
	    }
	  }
	  // TODO: This doesn't enforce the blank line between options and template, but
	  // that might be more trouble than it's worth
	  var body = parsedAny ? s.slice(begin) : s;

	  for (var o in options) {
	    parsed[o] = options[o];
	  }
	  return Template(body, parsed);
	}

	// Public function to combine a template string and data directly.  Use this
	// when you don't care about the speed of compiling.
	function expand(template_str, data, options) {
	  var t = Template(template_str, options);
	  return t.expand(data);
	}


	// We just export one name for now, the Template "class".
	// We need HtmlEscape in the browser tests, so might as well export it.

	return {
	    Template: Template, HtmlEscape: HtmlEscape,
	    FunctionRegistry: FunctionRegistry, SimpleRegistry: SimpleRegistry,
	    CallableRegistry: CallableRegistry, ChainedRegistry: ChainedRegistry,
	    fromString: fromString, expand: expand, Context: Context,
	    // Private but exposed for testing
	    _Section: _Section
	    };

	}();

	// Make it a CommonJS module
	for (var key in jsontemplate) exports[key] = jsontemplate[key];



	/*** EXPORTS FROM exports-loader ***/
	module.exports = exports

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {/*! jQuery v2.0.3 | (c) 2005, 2013 jQuery Foundation, Inc. | jquery.org/license
	//@ sourceMappingURL=jquery.min.map
	*/
	(function(e,undefined){var t,n,r=typeof undefined,i=e.location,o=e.document,s=o.documentElement,a=e.jQuery,u=e.$,l={},c=[],p="2.0.3",f=c.concat,h=c.push,d=c.slice,g=c.indexOf,m=l.toString,y=l.hasOwnProperty,v=p.trim,x=function(e,n){return new x.fn.init(e,n,t)},b=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,w=/\S+/g,T=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,C=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,k=/^-ms-/,N=/-([\da-z])/gi,E=function(e,t){return t.toUpperCase()},S=function(){o.removeEventListener("DOMContentLoaded",S,!1),e.removeEventListener("load",S,!1),x.ready()};x.fn=x.prototype={jquery:p,constructor:x,init:function(e,t,n){var r,i;if(!e)return this;if("string"==typeof e){if(r="<"===e.charAt(0)&&">"===e.charAt(e.length-1)&&e.length>=3?[null,e,null]:T.exec(e),!r||!r[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(r[1]){if(t=t instanceof x?t[0]:t,x.merge(this,x.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:o,!0)),C.test(r[1])&&x.isPlainObject(t))for(r in t)x.isFunction(this[r])?this[r](t[r]):this.attr(r,t[r]);return this}return i=o.getElementById(r[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=o,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):x.isFunction(e)?n.ready(e):(e.selector!==undefined&&(this.selector=e.selector,this.context=e.context),x.makeArray(e,this))},selector:"",length:0,toArray:function(){return d.call(this)},get:function(e){return null==e?this.toArray():0>e?this[this.length+e]:this[e]},pushStack:function(e){var t=x.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e,t){return x.each(this,e,t)},ready:function(e){return x.ready.promise().done(e),this},slice:function(){return this.pushStack(d.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(0>e?t:0);return this.pushStack(n>=0&&t>n?[this[n]]:[])},map:function(e){return this.pushStack(x.map(this,function(t,n){return e.call(t,n,t)}))},end:function(){return this.prevObject||this.constructor(null)},push:h,sort:[].sort,splice:[].splice},x.fn.init.prototype=x.fn,x.extend=x.fn.extend=function(){var e,t,n,r,i,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[1]||{},a=2),"object"==typeof s||x.isFunction(s)||(s={}),u===a&&(s=this,--a);u>a;a++)if(null!=(e=arguments[a]))for(t in e)n=s[t],r=e[t],s!==r&&(l&&r&&(x.isPlainObject(r)||(i=x.isArray(r)))?(i?(i=!1,o=n&&x.isArray(n)?n:[]):o=n&&x.isPlainObject(n)?n:{},s[t]=x.extend(l,o,r)):r!==undefined&&(s[t]=r));return s},x.extend({expando:"jQuery"+(p+Math.random()).replace(/\D/g,""),noConflict:function(t){return e.$===x&&(e.$=u),t&&e.jQuery===x&&(e.jQuery=a),x},isReady:!1,readyWait:1,holdReady:function(e){e?x.readyWait++:x.ready(!0)},ready:function(e){(e===!0?--x.readyWait:x.isReady)||(x.isReady=!0,e!==!0&&--x.readyWait>0||(n.resolveWith(o,[x]),x.fn.trigger&&x(o).trigger("ready").off("ready")))},isFunction:function(e){return"function"===x.type(e)},isArray:Array.isArray,isWindow:function(e){return null!=e&&e===e.window},isNumeric:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?l[m.call(e)]||"object":typeof e},isPlainObject:function(e){if("object"!==x.type(e)||e.nodeType||x.isWindow(e))return!1;try{if(e.constructor&&!y.call(e.constructor.prototype,"isPrototypeOf"))return!1}catch(t){return!1}return!0},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},error:function(e){throw Error(e)},parseHTML:function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||o;var r=C.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=x.buildFragment([e],t,i),i&&x(i).remove(),x.merge([],r.childNodes))},parseJSON:JSON.parse,parseXML:function(e){var t,n;if(!e||"string"!=typeof e)return null;try{n=new DOMParser,t=n.parseFromString(e,"text/xml")}catch(r){t=undefined}return(!t||t.getElementsByTagName("parsererror").length)&&x.error("Invalid XML: "+e),t},noop:function(){},globalEval:function(e){var t,n=eval;e=x.trim(e),e&&(1===e.indexOf("use strict")?(t=o.createElement("script"),t.text=e,o.head.appendChild(t).parentNode.removeChild(t)):n(e))},camelCase:function(e){return e.replace(k,"ms-").replace(N,E)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t,n){var r,i=0,o=e.length,s=j(e);if(n){if(s){for(;o>i;i++)if(r=t.apply(e[i],n),r===!1)break}else for(i in e)if(r=t.apply(e[i],n),r===!1)break}else if(s){for(;o>i;i++)if(r=t.call(e[i],i,e[i]),r===!1)break}else for(i in e)if(r=t.call(e[i],i,e[i]),r===!1)break;return e},trim:function(e){return null==e?"":v.call(e)},makeArray:function(e,t){var n=t||[];return null!=e&&(j(Object(e))?x.merge(n,"string"==typeof e?[e]:e):h.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:g.call(t,e,n)},merge:function(e,t){var n=t.length,r=e.length,i=0;if("number"==typeof n)for(;n>i;i++)e[r++]=t[i];else while(t[i]!==undefined)e[r++]=t[i++];return e.length=r,e},grep:function(e,t,n){var r,i=[],o=0,s=e.length;for(n=!!n;s>o;o++)r=!!t(e[o],o),n!==r&&i.push(e[o]);return i},map:function(e,t,n){var r,i=0,o=e.length,s=j(e),a=[];if(s)for(;o>i;i++)r=t(e[i],i,n),null!=r&&(a[a.length]=r);else for(i in e)r=t(e[i],i,n),null!=r&&(a[a.length]=r);return f.apply([],a)},guid:1,proxy:function(e,t){var n,r,i;return"string"==typeof t&&(n=e[t],t=e,e=n),x.isFunction(e)?(r=d.call(arguments,2),i=function(){return e.apply(t||this,r.concat(d.call(arguments)))},i.guid=e.guid=e.guid||x.guid++,i):undefined},access:function(e,t,n,r,i,o,s){var a=0,u=e.length,l=null==n;if("object"===x.type(n)){i=!0;for(a in n)x.access(e,t,a,n[a],!0,o,s)}else if(r!==undefined&&(i=!0,x.isFunction(r)||(s=!0),l&&(s?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(x(e),n)})),t))for(;u>a;a++)t(e[a],n,s?r:r.call(e[a],a,t(e[a],n)));return i?e:l?t.call(e):u?t(e[0],n):o},now:Date.now,swap:function(e,t,n,r){var i,o,s={};for(o in t)s[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=s[o];return i}}),x.ready.promise=function(t){return n||(n=x.Deferred(),"complete"===o.readyState?setTimeout(x.ready):(o.addEventListener("DOMContentLoaded",S,!1),e.addEventListener("load",S,!1))),n.promise(t)},x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(e,t){l["[object "+t+"]"]=t.toLowerCase()});function j(e){var t=e.length,n=x.type(e);return x.isWindow(e)?!1:1===e.nodeType&&t?!0:"array"===n||"function"!==n&&(0===t||"number"==typeof t&&t>0&&t-1 in e)}t=x(o),function(e,undefined){var t,n,r,i,o,s,a,u,l,c,p,f,h,d,g,m,y,v="sizzle"+-new Date,b=e.document,w=0,T=0,C=st(),k=st(),N=st(),E=!1,S=function(e,t){return e===t?(E=!0,0):0},j=typeof undefined,D=1<<31,A={}.hasOwnProperty,L=[],q=L.pop,H=L.push,O=L.push,F=L.slice,P=L.indexOf||function(e){var t=0,n=this.length;for(;n>t;t++)if(this[t]===e)return t;return-1},R="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",W="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",$=W.replace("w","w#"),B="\\["+M+"*("+W+")"+M+"*(?:([*^$|!~]?=)"+M+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+$+")|)|)"+M+"*\\]",I=":("+W+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+B.replace(3,8)+")*)|.*)\\)|)",z=RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),_=RegExp("^"+M+"*,"+M+"*"),X=RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),U=RegExp(M+"*[+~]"),Y=RegExp("="+M+"*([^\\]'\"]*)"+M+"*\\]","g"),V=RegExp(I),G=RegExp("^"+$+"$"),J={ID:RegExp("^#("+W+")"),CLASS:RegExp("^\\.("+W+")"),TAG:RegExp("^("+W.replace("w","w*")+")"),ATTR:RegExp("^"+B),PSEUDO:RegExp("^"+I),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:RegExp("^(?:"+R+")$","i"),needsContext:RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},Q=/^[^{]+\{\s*\[native \w/,K=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,Z=/^(?:input|select|textarea|button)$/i,et=/^h\d$/i,tt=/'|\\/g,nt=RegExp("\\\\([\\da-f]{1,6}"+M+"?|("+M+")|.)","ig"),rt=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:0>r?String.fromCharCode(r+65536):String.fromCharCode(55296|r>>10,56320|1023&r)};try{O.apply(L=F.call(b.childNodes),b.childNodes),L[b.childNodes.length].nodeType}catch(it){O={apply:L.length?function(e,t){H.apply(e,F.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function ot(e,t,r,i){var o,s,a,u,l,f,g,m,x,w;if((t?t.ownerDocument||t:b)!==p&&c(t),t=t||p,r=r||[],!e||"string"!=typeof e)return r;if(1!==(u=t.nodeType)&&9!==u)return[];if(h&&!i){if(o=K.exec(e))if(a=o[1]){if(9===u){if(s=t.getElementById(a),!s||!s.parentNode)return r;if(s.id===a)return r.push(s),r}else if(t.ownerDocument&&(s=t.ownerDocument.getElementById(a))&&y(t,s)&&s.id===a)return r.push(s),r}else{if(o[2])return O.apply(r,t.getElementsByTagName(e)),r;if((a=o[3])&&n.getElementsByClassName&&t.getElementsByClassName)return O.apply(r,t.getElementsByClassName(a)),r}if(n.qsa&&(!d||!d.test(e))){if(m=g=v,x=t,w=9===u&&e,1===u&&"object"!==t.nodeName.toLowerCase()){f=gt(e),(g=t.getAttribute("id"))?m=g.replace(tt,"\\$&"):t.setAttribute("id",m),m="[id='"+m+"'] ",l=f.length;while(l--)f[l]=m+mt(f[l]);x=U.test(e)&&t.parentNode||t,w=f.join(",")}if(w)try{return O.apply(r,x.querySelectorAll(w)),r}catch(T){}finally{g||t.removeAttribute("id")}}}return kt(e.replace(z,"$1"),t,r,i)}function st(){var e=[];function t(n,r){return e.push(n+=" ")>i.cacheLength&&delete t[e.shift()],t[n]=r}return t}function at(e){return e[v]=!0,e}function ut(e){var t=p.createElement("div");try{return!!e(t)}catch(n){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function lt(e,t){var n=e.split("|"),r=e.length;while(r--)i.attrHandle[n[r]]=t}function ct(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||D)-(~e.sourceIndex||D);if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function pt(e){return function(t){var n=t.nodeName.toLowerCase();return"input"===n&&t.type===e}}function ft(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function ht(e){return at(function(t){return t=+t,at(function(n,r){var i,o=e([],n.length,t),s=o.length;while(s--)n[i=o[s]]&&(n[i]=!(r[i]=n[i]))})})}s=ot.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?"HTML"!==t.nodeName:!1},n=ot.support={},c=ot.setDocument=function(e){var t=e?e.ownerDocument||e:b,r=t.defaultView;return t!==p&&9===t.nodeType&&t.documentElement?(p=t,f=t.documentElement,h=!s(t),r&&r.attachEvent&&r!==r.top&&r.attachEvent("onbeforeunload",function(){c()}),n.attributes=ut(function(e){return e.className="i",!e.getAttribute("className")}),n.getElementsByTagName=ut(function(e){return e.appendChild(t.createComment("")),!e.getElementsByTagName("*").length}),n.getElementsByClassName=ut(function(e){return e.innerHTML="<div class='a'></div><div class='a i'></div>",e.firstChild.className="i",2===e.getElementsByClassName("i").length}),n.getById=ut(function(e){return f.appendChild(e).id=v,!t.getElementsByName||!t.getElementsByName(v).length}),n.getById?(i.find.ID=function(e,t){if(typeof t.getElementById!==j&&h){var n=t.getElementById(e);return n&&n.parentNode?[n]:[]}},i.filter.ID=function(e){var t=e.replace(nt,rt);return function(e){return e.getAttribute("id")===t}}):(delete i.find.ID,i.filter.ID=function(e){var t=e.replace(nt,rt);return function(e){var n=typeof e.getAttributeNode!==j&&e.getAttributeNode("id");return n&&n.value===t}}),i.find.TAG=n.getElementsByTagName?function(e,t){return typeof t.getElementsByTagName!==j?t.getElementsByTagName(e):undefined}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},i.find.CLASS=n.getElementsByClassName&&function(e,t){return typeof t.getElementsByClassName!==j&&h?t.getElementsByClassName(e):undefined},g=[],d=[],(n.qsa=Q.test(t.querySelectorAll))&&(ut(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||d.push("\\["+M+"*(?:value|"+R+")"),e.querySelectorAll(":checked").length||d.push(":checked")}),ut(function(e){var n=t.createElement("input");n.setAttribute("type","hidden"),e.appendChild(n).setAttribute("t",""),e.querySelectorAll("[t^='']").length&&d.push("[*^$]="+M+"*(?:''|\"\")"),e.querySelectorAll(":enabled").length||d.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),d.push(",.*:")})),(n.matchesSelector=Q.test(m=f.webkitMatchesSelector||f.mozMatchesSelector||f.oMatchesSelector||f.msMatchesSelector))&&ut(function(e){n.disconnectedMatch=m.call(e,"div"),m.call(e,"[s!='']:x"),g.push("!=",I)}),d=d.length&&RegExp(d.join("|")),g=g.length&&RegExp(g.join("|")),y=Q.test(f.contains)||f.compareDocumentPosition?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},S=f.compareDocumentPosition?function(e,r){if(e===r)return E=!0,0;var i=r.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(r);return i?1&i||!n.sortDetached&&r.compareDocumentPosition(e)===i?e===t||y(b,e)?-1:r===t||y(b,r)?1:l?P.call(l,e)-P.call(l,r):0:4&i?-1:1:e.compareDocumentPosition?-1:1}:function(e,n){var r,i=0,o=e.parentNode,s=n.parentNode,a=[e],u=[n];if(e===n)return E=!0,0;if(!o||!s)return e===t?-1:n===t?1:o?-1:s?1:l?P.call(l,e)-P.call(l,n):0;if(o===s)return ct(e,n);r=e;while(r=r.parentNode)a.unshift(r);r=n;while(r=r.parentNode)u.unshift(r);while(a[i]===u[i])i++;return i?ct(a[i],u[i]):a[i]===b?-1:u[i]===b?1:0},t):p},ot.matches=function(e,t){return ot(e,null,null,t)},ot.matchesSelector=function(e,t){if((e.ownerDocument||e)!==p&&c(e),t=t.replace(Y,"='$1']"),!(!n.matchesSelector||!h||g&&g.test(t)||d&&d.test(t)))try{var r=m.call(e,t);if(r||n.disconnectedMatch||e.document&&11!==e.document.nodeType)return r}catch(i){}return ot(t,p,null,[e]).length>0},ot.contains=function(e,t){return(e.ownerDocument||e)!==p&&c(e),y(e,t)},ot.attr=function(e,t){(e.ownerDocument||e)!==p&&c(e);var r=i.attrHandle[t.toLowerCase()],o=r&&A.call(i.attrHandle,t.toLowerCase())?r(e,t,!h):undefined;return o===undefined?n.attributes||!h?e.getAttribute(t):(o=e.getAttributeNode(t))&&o.specified?o.value:null:o},ot.error=function(e){throw Error("Syntax error, unrecognized expression: "+e)},ot.uniqueSort=function(e){var t,r=[],i=0,o=0;if(E=!n.detectDuplicates,l=!n.sortStable&&e.slice(0),e.sort(S),E){while(t=e[o++])t===e[o]&&(i=r.push(o));while(i--)e.splice(r[i],1)}return e},o=ot.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=o(e)}else if(3===i||4===i)return e.nodeValue}else for(;t=e[r];r++)n+=o(t);return n},i=ot.selectors={cacheLength:50,createPseudo:at,match:J,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(nt,rt),e[3]=(e[4]||e[5]||"").replace(nt,rt),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||ot.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&ot.error(e[0]),e},PSEUDO:function(e){var t,n=!e[5]&&e[2];return J.CHILD.test(e[0])?null:(e[3]&&e[4]!==undefined?e[2]=e[4]:n&&V.test(n)&&(t=gt(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(nt,rt).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=C[e+" "];return t||(t=RegExp("(^|"+M+")"+e+"("+M+"|$)"))&&C(e,function(e){return t.test("string"==typeof e.className&&e.className||typeof e.getAttribute!==j&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=ot.attr(r,e);return null==i?"!="===t:t?(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i+" ").indexOf(n)>-1:"|="===t?i===n||i.slice(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),s="last"!==e.slice(-4),a="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,p,f,h,d,g=o!==s?"nextSibling":"previousSibling",m=t.parentNode,y=a&&t.nodeName.toLowerCase(),x=!u&&!a;if(m){if(o){while(g){p=t;while(p=p[g])if(a?p.nodeName.toLowerCase()===y:1===p.nodeType)return!1;d=g="only"===e&&!d&&"nextSibling"}return!0}if(d=[s?m.firstChild:m.lastChild],s&&x){c=m[v]||(m[v]={}),l=c[e]||[],h=l[0]===w&&l[1],f=l[0]===w&&l[2],p=h&&m.childNodes[h];while(p=++h&&p&&p[g]||(f=h=0)||d.pop())if(1===p.nodeType&&++f&&p===t){c[e]=[w,h,f];break}}else if(x&&(l=(t[v]||(t[v]={}))[e])&&l[0]===w)f=l[1];else while(p=++h&&p&&p[g]||(f=h=0)||d.pop())if((a?p.nodeName.toLowerCase()===y:1===p.nodeType)&&++f&&(x&&((p[v]||(p[v]={}))[e]=[w,f]),p===t))break;return f-=i,f===r||0===f%r&&f/r>=0}}},PSEUDO:function(e,t){var n,r=i.pseudos[e]||i.setFilters[e.toLowerCase()]||ot.error("unsupported pseudo: "+e);return r[v]?r(t):r.length>1?(n=[e,e,"",t],i.setFilters.hasOwnProperty(e.toLowerCase())?at(function(e,n){var i,o=r(e,t),s=o.length;while(s--)i=P.call(e,o[s]),e[i]=!(n[i]=o[s])}):function(e){return r(e,0,n)}):r}},pseudos:{not:at(function(e){var t=[],n=[],r=a(e.replace(z,"$1"));return r[v]?at(function(e,t,n,i){var o,s=r(e,null,i,[]),a=e.length;while(a--)(o=s[a])&&(e[a]=!(t[a]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),!n.pop()}}),has:at(function(e){return function(t){return ot(e,t).length>0}}),contains:at(function(e){return function(t){return(t.textContent||t.innerText||o(t)).indexOf(e)>-1}}),lang:at(function(e){return G.test(e||"")||ot.error("unsupported lang: "+e),e=e.replace(nt,rt).toLowerCase(),function(t){var n;do if(n=h?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return n=n.toLowerCase(),n===e||0===n.indexOf(e+"-");while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===f},focus:function(e){return e===p.activeElement&&(!p.hasFocus||p.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeName>"@"||3===e.nodeType||4===e.nodeType)return!1;return!0},parent:function(e){return!i.pseudos.empty(e)},header:function(e){return et.test(e.nodeName)},input:function(e){return Z.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||t.toLowerCase()===e.type)},first:ht(function(){return[0]}),last:ht(function(e,t){return[t-1]}),eq:ht(function(e,t,n){return[0>n?n+t:n]}),even:ht(function(e,t){var n=0;for(;t>n;n+=2)e.push(n);return e}),odd:ht(function(e,t){var n=1;for(;t>n;n+=2)e.push(n);return e}),lt:ht(function(e,t,n){var r=0>n?n+t:n;for(;--r>=0;)e.push(r);return e}),gt:ht(function(e,t,n){var r=0>n?n+t:n;for(;t>++r;)e.push(r);return e})}},i.pseudos.nth=i.pseudos.eq;for(t in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})i.pseudos[t]=pt(t);for(t in{submit:!0,reset:!0})i.pseudos[t]=ft(t);function dt(){}dt.prototype=i.filters=i.pseudos,i.setFilters=new dt;function gt(e,t){var n,r,o,s,a,u,l,c=k[e+" "];if(c)return t?0:c.slice(0);a=e,u=[],l=i.preFilter;while(a){(!n||(r=_.exec(a)))&&(r&&(a=a.slice(r[0].length)||a),u.push(o=[])),n=!1,(r=X.exec(a))&&(n=r.shift(),o.push({value:n,type:r[0].replace(z," ")}),a=a.slice(n.length));for(s in i.filter)!(r=J[s].exec(a))||l[s]&&!(r=l[s](r))||(n=r.shift(),o.push({value:n,type:s,matches:r}),a=a.slice(n.length));if(!n)break}return t?a.length:a?ot.error(e):k(e,u).slice(0)}function mt(e){var t=0,n=e.length,r="";for(;n>t;t++)r+=e[t].value;return r}function yt(e,t,n){var i=t.dir,o=n&&"parentNode"===i,s=T++;return t.first?function(t,n,r){while(t=t[i])if(1===t.nodeType||o)return e(t,n,r)}:function(t,n,a){var u,l,c,p=w+" "+s;if(a){while(t=t[i])if((1===t.nodeType||o)&&e(t,n,a))return!0}else while(t=t[i])if(1===t.nodeType||o)if(c=t[v]||(t[v]={}),(l=c[i])&&l[0]===p){if((u=l[1])===!0||u===r)return u===!0}else if(l=c[i]=[p],l[1]=e(t,n,a)||r,l[1]===!0)return!0}}function vt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function xt(e,t,n,r,i){var o,s=[],a=0,u=e.length,l=null!=t;for(;u>a;a++)(o=e[a])&&(!n||n(o,r,i))&&(s.push(o),l&&t.push(a));return s}function bt(e,t,n,r,i,o){return r&&!r[v]&&(r=bt(r)),i&&!i[v]&&(i=bt(i,o)),at(function(o,s,a,u){var l,c,p,f=[],h=[],d=s.length,g=o||Ct(t||"*",a.nodeType?[a]:a,[]),m=!e||!o&&t?g:xt(g,f,e,a,u),y=n?i||(o?e:d||r)?[]:s:m;if(n&&n(m,y,a,u),r){l=xt(y,h),r(l,[],a,u),c=l.length;while(c--)(p=l[c])&&(y[h[c]]=!(m[h[c]]=p))}if(o){if(i||e){if(i){l=[],c=y.length;while(c--)(p=y[c])&&l.push(m[c]=p);i(null,y=[],l,u)}c=y.length;while(c--)(p=y[c])&&(l=i?P.call(o,p):f[c])>-1&&(o[l]=!(s[l]=p))}}else y=xt(y===s?y.splice(d,y.length):y),i?i(null,s,y,u):O.apply(s,y)})}function wt(e){var t,n,r,o=e.length,s=i.relative[e[0].type],a=s||i.relative[" "],l=s?1:0,c=yt(function(e){return e===t},a,!0),p=yt(function(e){return P.call(t,e)>-1},a,!0),f=[function(e,n,r){return!s&&(r||n!==u)||((t=n).nodeType?c(e,n,r):p(e,n,r))}];for(;o>l;l++)if(n=i.relative[e[l].type])f=[yt(vt(f),n)];else{if(n=i.filter[e[l].type].apply(null,e[l].matches),n[v]){for(r=++l;o>r;r++)if(i.relative[e[r].type])break;return bt(l>1&&vt(f),l>1&&mt(e.slice(0,l-1).concat({value:" "===e[l-2].type?"*":""})).replace(z,"$1"),n,r>l&&wt(e.slice(l,r)),o>r&&wt(e=e.slice(r)),o>r&&mt(e))}f.push(n)}return vt(f)}function Tt(e,t){var n=0,o=t.length>0,s=e.length>0,a=function(a,l,c,f,h){var d,g,m,y=[],v=0,x="0",b=a&&[],T=null!=h,C=u,k=a||s&&i.find.TAG("*",h&&l.parentNode||l),N=w+=null==C?1:Math.random()||.1;for(T&&(u=l!==p&&l,r=n);null!=(d=k[x]);x++){if(s&&d){g=0;while(m=e[g++])if(m(d,l,c)){f.push(d);break}T&&(w=N,r=++n)}o&&((d=!m&&d)&&v--,a&&b.push(d))}if(v+=x,o&&x!==v){g=0;while(m=t[g++])m(b,y,l,c);if(a){if(v>0)while(x--)b[x]||y[x]||(y[x]=q.call(f));y=xt(y)}O.apply(f,y),T&&!a&&y.length>0&&v+t.length>1&&ot.uniqueSort(f)}return T&&(w=N,u=C),b};return o?at(a):a}a=ot.compile=function(e,t){var n,r=[],i=[],o=N[e+" "];if(!o){t||(t=gt(e)),n=t.length;while(n--)o=wt(t[n]),o[v]?r.push(o):i.push(o);o=N(e,Tt(i,r))}return o};function Ct(e,t,n){var r=0,i=t.length;for(;i>r;r++)ot(e,t[r],n);return n}function kt(e,t,r,o){var s,u,l,c,p,f=gt(e);if(!o&&1===f.length){if(u=f[0]=f[0].slice(0),u.length>2&&"ID"===(l=u[0]).type&&n.getById&&9===t.nodeType&&h&&i.relative[u[1].type]){if(t=(i.find.ID(l.matches[0].replace(nt,rt),t)||[])[0],!t)return r;e=e.slice(u.shift().value.length)}s=J.needsContext.test(e)?0:u.length;while(s--){if(l=u[s],i.relative[c=l.type])break;if((p=i.find[c])&&(o=p(l.matches[0].replace(nt,rt),U.test(u[0].type)&&t.parentNode||t))){if(u.splice(s,1),e=o.length&&mt(u),!e)return O.apply(r,o),r;break}}}return a(e,f)(o,t,!h,r,U.test(e)),r}n.sortStable=v.split("").sort(S).join("")===v,n.detectDuplicates=E,c(),n.sortDetached=ut(function(e){return 1&e.compareDocumentPosition(p.createElement("div"))}),ut(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||lt("type|href|height|width",function(e,t,n){return n?undefined:e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),n.attributes&&ut(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||lt("value",function(e,t,n){return n||"input"!==e.nodeName.toLowerCase()?undefined:e.defaultValue}),ut(function(e){return null==e.getAttribute("disabled")})||lt(R,function(e,t,n){var r;return n?undefined:(r=e.getAttributeNode(t))&&r.specified?r.value:e[t]===!0?t.toLowerCase():null}),x.find=ot,x.expr=ot.selectors,x.expr[":"]=x.expr.pseudos,x.unique=ot.uniqueSort,x.text=ot.getText,x.isXMLDoc=ot.isXML,x.contains=ot.contains}(e);var D={};function A(e){var t=D[e]={};return x.each(e.match(w)||[],function(e,n){t[n]=!0}),t}x.Callbacks=function(e){e="string"==typeof e?D[e]||A(e):x.extend({},e);var t,n,r,i,o,s,a=[],u=!e.once&&[],l=function(p){for(t=e.memory&&p,n=!0,s=i||0,i=0,o=a.length,r=!0;a&&o>s;s++)if(a[s].apply(p[0],p[1])===!1&&e.stopOnFalse){t=!1;break}r=!1,a&&(u?u.length&&l(u.shift()):t?a=[]:c.disable())},c={add:function(){if(a){var n=a.length;(function s(t){x.each(t,function(t,n){var r=x.type(n);"function"===r?e.unique&&c.has(n)||a.push(n):n&&n.length&&"string"!==r&&s(n)})})(arguments),r?o=a.length:t&&(i=n,l(t))}return this},remove:function(){return a&&x.each(arguments,function(e,t){var n;while((n=x.inArray(t,a,n))>-1)a.splice(n,1),r&&(o>=n&&o--,s>=n&&s--)}),this},has:function(e){return e?x.inArray(e,a)>-1:!(!a||!a.length)},empty:function(){return a=[],o=0,this},disable:function(){return a=u=t=undefined,this},disabled:function(){return!a},lock:function(){return u=undefined,t||c.disable(),this},locked:function(){return!u},fireWith:function(e,t){return!a||n&&!u||(t=t||[],t=[e,t.slice?t.slice():t],r?u.push(t):l(t)),this},fire:function(){return c.fireWith(this,arguments),this},fired:function(){return!!n}};return c},x.extend({Deferred:function(e){var t=[["resolve","done",x.Callbacks("once memory"),"resolved"],["reject","fail",x.Callbacks("once memory"),"rejected"],["notify","progress",x.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return x.Deferred(function(n){x.each(t,function(t,o){var s=o[0],a=x.isFunction(e[t])&&e[t];i[o[1]](function(){var e=a&&a.apply(this,arguments);e&&x.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[s+"With"](this===r?n.promise():this,a?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?x.extend(e,r):r}},i={};return r.pipe=r.then,x.each(t,function(e,o){var s=o[2],a=o[3];r[o[1]]=s.add,a&&s.add(function(){n=a},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=s.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t=0,n=d.call(arguments),r=n.length,i=1!==r||e&&x.isFunction(e.promise)?r:0,o=1===i?e:x.Deferred(),s=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?d.call(arguments):r,n===a?o.notifyWith(t,n):--i||o.resolveWith(t,n)}},a,u,l;if(r>1)for(a=Array(r),u=Array(r),l=Array(r);r>t;t++)n[t]&&x.isFunction(n[t].promise)?n[t].promise().done(s(t,l,n)).fail(o.reject).progress(s(t,u,a)):--i;return i||o.resolveWith(l,n),o.promise()}}),x.support=function(t){var n=o.createElement("input"),r=o.createDocumentFragment(),i=o.createElement("div"),s=o.createElement("select"),a=s.appendChild(o.createElement("option"));return n.type?(n.type="checkbox",t.checkOn=""!==n.value,t.optSelected=a.selected,t.reliableMarginRight=!0,t.boxSizingReliable=!0,t.pixelPosition=!1,n.checked=!0,t.noCloneChecked=n.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!a.disabled,n=o.createElement("input"),n.value="t",n.type="radio",t.radioValue="t"===n.value,n.setAttribute("checked","t"),n.setAttribute("name","t"),r.appendChild(n),t.checkClone=r.cloneNode(!0).cloneNode(!0).lastChild.checked,t.focusinBubbles="onfocusin"in e,i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",t.clearCloneStyle="content-box"===i.style.backgroundClip,x(function(){var n,r,s="padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box",a=o.getElementsByTagName("body")[0];a&&(n=o.createElement("div"),n.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",a.appendChild(n).appendChild(i),i.innerHTML="",i.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%",x.swap(a,null!=a.style.zoom?{zoom:1}:{},function(){t.boxSizing=4===i.offsetWidth}),e.getComputedStyle&&(t.pixelPosition="1%"!==(e.getComputedStyle(i,null)||{}).top,t.boxSizingReliable="4px"===(e.getComputedStyle(i,null)||{width:"4px"}).width,r=i.appendChild(o.createElement("div")),r.style.cssText=i.style.cssText=s,r.style.marginRight=r.style.width="0",i.style.width="1px",t.reliableMarginRight=!parseFloat((e.getComputedStyle(r,null)||{}).marginRight)),a.removeChild(n))}),t):t}({});var L,q,H=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,O=/([A-Z])/g;function F(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=x.expando+Math.random()}F.uid=1,F.accepts=function(e){return e.nodeType?1===e.nodeType||9===e.nodeType:!0},F.prototype={key:function(e){if(!F.accepts(e))return 0;var t={},n=e[this.expando];if(!n){n=F.uid++;try{t[this.expando]={value:n},Object.defineProperties(e,t)}catch(r){t[this.expando]=n,x.extend(e,t)}}return this.cache[n]||(this.cache[n]={}),n},set:function(e,t,n){var r,i=this.key(e),o=this.cache[i];if("string"==typeof t)o[t]=n;else if(x.isEmptyObject(o))x.extend(this.cache[i],t);else for(r in t)o[r]=t[r];return o},get:function(e,t){var n=this.cache[this.key(e)];return t===undefined?n:n[t]},access:function(e,t,n){var r;return t===undefined||t&&"string"==typeof t&&n===undefined?(r=this.get(e,t),r!==undefined?r:this.get(e,x.camelCase(t))):(this.set(e,t,n),n!==undefined?n:t)},remove:function(e,t){var n,r,i,o=this.key(e),s=this.cache[o];if(t===undefined)this.cache[o]={};else{x.isArray(t)?r=t.concat(t.map(x.camelCase)):(i=x.camelCase(t),t in s?r=[t,i]:(r=i,r=r in s?[r]:r.match(w)||[])),n=r.length;while(n--)delete s[r[n]]}},hasData:function(e){return!x.isEmptyObject(this.cache[e[this.expando]]||{})},discard:function(e){e[this.expando]&&delete this.cache[e[this.expando]]}},L=new F,q=new F,x.extend({acceptData:F.accepts,hasData:function(e){return L.hasData(e)||q.hasData(e)},data:function(e,t,n){return L.access(e,t,n)},removeData:function(e,t){L.remove(e,t)},_data:function(e,t,n){return q.access(e,t,n)},_removeData:function(e,t){q.remove(e,t)}}),x.fn.extend({data:function(e,t){var n,r,i=this[0],o=0,s=null;if(e===undefined){if(this.length&&(s=L.get(i),1===i.nodeType&&!q.get(i,"hasDataAttrs"))){for(n=i.attributes;n.length>o;o++)r=n[o].name,0===r.indexOf("data-")&&(r=x.camelCase(r.slice(5)),P(i,r,s[r]));q.set(i,"hasDataAttrs",!0)}return s}return"object"==typeof e?this.each(function(){L.set(this,e)}):x.access(this,function(t){var n,r=x.camelCase(e);if(i&&t===undefined){if(n=L.get(i,e),n!==undefined)return n;if(n=L.get(i,r),n!==undefined)return n;if(n=P(i,r,undefined),n!==undefined)return n}else this.each(function(){var n=L.get(this,r);L.set(this,r,t),-1!==e.indexOf("-")&&n!==undefined&&L.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){L.remove(this,e)})}});function P(e,t,n){var r;if(n===undefined&&1===e.nodeType)if(r="data-"+t.replace(O,"-$1").toLowerCase(),n=e.getAttribute(r),"string"==typeof n){try{n="true"===n?!0:"false"===n?!1:"null"===n?null:+n+""===n?+n:H.test(n)?JSON.parse(n):n}catch(i){}L.set(e,t,n)}else n=undefined;return n}x.extend({queue:function(e,t,n){var r;return e?(t=(t||"fx")+"queue",r=q.get(e,t),n&&(!r||x.isArray(n)?r=q.access(e,t,x.makeArray(n)):r.push(n)),r||[]):undefined},dequeue:function(e,t){t=t||"fx";var n=x.queue(e,t),r=n.length,i=n.shift(),o=x._queueHooks(e,t),s=function(){x.dequeue(e,t)
	};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,s,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return q.get(e,n)||q.access(e,n,{empty:x.Callbacks("once memory").add(function(){q.remove(e,[t+"queue",n])})})}}),x.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),n>arguments.length?x.queue(this[0],e):t===undefined?this:this.each(function(){var n=x.queue(this,e,t);x._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&x.dequeue(this,e)})},dequeue:function(e){return this.each(function(){x.dequeue(this,e)})},delay:function(e,t){return e=x.fx?x.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r)}})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=x.Deferred(),o=this,s=this.length,a=function(){--r||i.resolveWith(o,[o])};"string"!=typeof e&&(t=e,e=undefined),e=e||"fx";while(s--)n=q.get(o[s],e+"queueHooks"),n&&n.empty&&(r++,n.empty.add(a));return a(),i.promise(t)}});var R,M,W=/[\t\r\n\f]/g,$=/\r/g,B=/^(?:input|select|textarea|button)$/i;x.fn.extend({attr:function(e,t){return x.access(this,x.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){x.removeAttr(this,e)})},prop:function(e,t){return x.access(this,x.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[x.propFix[e]||e]})},addClass:function(e){var t,n,r,i,o,s=0,a=this.length,u="string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).addClass(e.call(this,t,this.className))});if(u)for(t=(e||"").match(w)||[];a>s;s++)if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):" ")){o=0;while(i=t[o++])0>r.indexOf(" "+i+" ")&&(r+=i+" ");n.className=x.trim(r)}return this},removeClass:function(e){var t,n,r,i,o,s=0,a=this.length,u=0===arguments.length||"string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).removeClass(e.call(this,t,this.className))});if(u)for(t=(e||"").match(w)||[];a>s;s++)if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):"")){o=0;while(i=t[o++])while(r.indexOf(" "+i+" ")>=0)r=r.replace(" "+i+" "," ");n.className=e?x.trim(r):""}return this},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):x.isFunction(e)?this.each(function(n){x(this).toggleClass(e.call(this,n,this.className,t),t)}):this.each(function(){if("string"===n){var t,i=0,o=x(this),s=e.match(w)||[];while(t=s[i++])o.hasClass(t)?o.removeClass(t):o.addClass(t)}else(n===r||"boolean"===n)&&(this.className&&q.set(this,"__className__",this.className),this.className=this.className||e===!1?"":q.get(this,"__className__")||"")})},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;r>n;n++)if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(W," ").indexOf(t)>=0)return!0;return!1},val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=x.isFunction(e),this.each(function(n){var i;1===this.nodeType&&(i=r?e.call(this,n,x(this).val()):e,null==i?i="":"number"==typeof i?i+="":x.isArray(i)&&(i=x.map(i,function(e){return null==e?"":e+""})),t=x.valHooks[this.type]||x.valHooks[this.nodeName.toLowerCase()],t&&"set"in t&&t.set(this,i,"value")!==undefined||(this.value=i))});if(i)return t=x.valHooks[i.type]||x.valHooks[i.nodeName.toLowerCase()],t&&"get"in t&&(n=t.get(i,"value"))!==undefined?n:(n=i.value,"string"==typeof n?n.replace($,""):null==n?"":n)}}}),x.extend({valHooks:{option:{get:function(e){var t=e.attributes.value;return!t||t.specified?e.value:e.text}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||0>i,s=o?null:[],a=o?i+1:r.length,u=0>i?a:o?i:0;for(;a>u;u++)if(n=r[u],!(!n.selected&&u!==i||(x.support.optDisabled?n.disabled:null!==n.getAttribute("disabled"))||n.parentNode.disabled&&x.nodeName(n.parentNode,"optgroup"))){if(t=x(n).val(),o)return t;s.push(t)}return s},set:function(e,t){var n,r,i=e.options,o=x.makeArray(t),s=i.length;while(s--)r=i[s],(r.selected=x.inArray(x(r).val(),o)>=0)&&(n=!0);return n||(e.selectedIndex=-1),o}}},attr:function(e,t,n){var i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return typeof e.getAttribute===r?x.prop(e,t,n):(1===s&&x.isXMLDoc(e)||(t=t.toLowerCase(),i=x.attrHooks[t]||(x.expr.match.bool.test(t)?M:R)),n===undefined?i&&"get"in i&&null!==(o=i.get(e,t))?o:(o=x.find.attr(e,t),null==o?undefined:o):null!==n?i&&"set"in i&&(o=i.set(e,n,t))!==undefined?o:(e.setAttribute(t,n+""),n):(x.removeAttr(e,t),undefined))},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(w);if(o&&1===e.nodeType)while(n=o[i++])r=x.propFix[n]||n,x.expr.match.bool.test(n)&&(e[r]=!1),e.removeAttribute(n)},attrHooks:{type:{set:function(e,t){if(!x.support.radioValue&&"radio"===t&&x.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},propFix:{"for":"htmlFor","class":"className"},prop:function(e,t,n){var r,i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return o=1!==s||!x.isXMLDoc(e),o&&(t=x.propFix[t]||t,i=x.propHooks[t]),n!==undefined?i&&"set"in i&&(r=i.set(e,n,t))!==undefined?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){return e.hasAttribute("tabindex")||B.test(e.nodeName)||e.href?e.tabIndex:-1}}}}),M={set:function(e,t,n){return t===!1?x.removeAttr(e,n):e.setAttribute(n,n),n}},x.each(x.expr.match.bool.source.match(/\w+/g),function(e,t){var n=x.expr.attrHandle[t]||x.find.attr;x.expr.attrHandle[t]=function(e,t,r){var i=x.expr.attrHandle[t],o=r?undefined:(x.expr.attrHandle[t]=undefined)!=n(e,t,r)?t.toLowerCase():null;return x.expr.attrHandle[t]=i,o}}),x.support.optSelected||(x.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null}}),x.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){x.propFix[this.toLowerCase()]=this}),x.each(["radio","checkbox"],function(){x.valHooks[this]={set:function(e,t){return x.isArray(t)?e.checked=x.inArray(x(e).val(),t)>=0:undefined}},x.support.checkOn||(x.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var I=/^key/,z=/^(?:mouse|contextmenu)|click/,_=/^(?:focusinfocus|focusoutblur)$/,X=/^([^.]*)(?:\.(.+)|)$/;function U(){return!0}function Y(){return!1}function V(){try{return o.activeElement}catch(e){}}x.event={global:{},add:function(e,t,n,i,o){var s,a,u,l,c,p,f,h,d,g,m,y=q.get(e);if(y){n.handler&&(s=n,n=s.handler,o=s.selector),n.guid||(n.guid=x.guid++),(l=y.events)||(l=y.events={}),(a=y.handle)||(a=y.handle=function(e){return typeof x===r||e&&x.event.triggered===e.type?undefined:x.event.dispatch.apply(a.elem,arguments)},a.elem=e),t=(t||"").match(w)||[""],c=t.length;while(c--)u=X.exec(t[c])||[],d=m=u[1],g=(u[2]||"").split(".").sort(),d&&(f=x.event.special[d]||{},d=(o?f.delegateType:f.bindType)||d,f=x.event.special[d]||{},p=x.extend({type:d,origType:m,data:i,handler:n,guid:n.guid,selector:o,needsContext:o&&x.expr.match.needsContext.test(o),namespace:g.join(".")},s),(h=l[d])||(h=l[d]=[],h.delegateCount=0,f.setup&&f.setup.call(e,i,g,a)!==!1||e.addEventListener&&e.addEventListener(d,a,!1)),f.add&&(f.add.call(e,p),p.handler.guid||(p.handler.guid=n.guid)),o?h.splice(h.delegateCount++,0,p):h.push(p),x.event.global[d]=!0);e=null}},remove:function(e,t,n,r,i){var o,s,a,u,l,c,p,f,h,d,g,m=q.hasData(e)&&q.get(e);if(m&&(u=m.events)){t=(t||"").match(w)||[""],l=t.length;while(l--)if(a=X.exec(t[l])||[],h=g=a[1],d=(a[2]||"").split(".").sort(),h){p=x.event.special[h]||{},h=(r?p.delegateType:p.bindType)||h,f=u[h]||[],a=a[2]&&RegExp("(^|\\.)"+d.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=f.length;while(o--)c=f[o],!i&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(f.splice(o,1),c.selector&&f.delegateCount--,p.remove&&p.remove.call(e,c));s&&!f.length&&(p.teardown&&p.teardown.call(e,d,m.handle)!==!1||x.removeEvent(e,h,m.handle),delete u[h])}else for(h in u)x.event.remove(e,h+t[l],n,r,!0);x.isEmptyObject(u)&&(delete m.handle,q.remove(e,"events"))}},trigger:function(t,n,r,i){var s,a,u,l,c,p,f,h=[r||o],d=y.call(t,"type")?t.type:t,g=y.call(t,"namespace")?t.namespace.split("."):[];if(a=u=r=r||o,3!==r.nodeType&&8!==r.nodeType&&!_.test(d+x.event.triggered)&&(d.indexOf(".")>=0&&(g=d.split("."),d=g.shift(),g.sort()),c=0>d.indexOf(":")&&"on"+d,t=t[x.expando]?t:new x.Event(d,"object"==typeof t&&t),t.isTrigger=i?2:3,t.namespace=g.join("."),t.namespace_re=t.namespace?RegExp("(^|\\.)"+g.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=undefined,t.target||(t.target=r),n=null==n?[t]:x.makeArray(n,[t]),f=x.event.special[d]||{},i||!f.trigger||f.trigger.apply(r,n)!==!1)){if(!i&&!f.noBubble&&!x.isWindow(r)){for(l=f.delegateType||d,_.test(l+d)||(a=a.parentNode);a;a=a.parentNode)h.push(a),u=a;u===(r.ownerDocument||o)&&h.push(u.defaultView||u.parentWindow||e)}s=0;while((a=h[s++])&&!t.isPropagationStopped())t.type=s>1?l:f.bindType||d,p=(q.get(a,"events")||{})[t.type]&&q.get(a,"handle"),p&&p.apply(a,n),p=c&&a[c],p&&x.acceptData(a)&&p.apply&&p.apply(a,n)===!1&&t.preventDefault();return t.type=d,i||t.isDefaultPrevented()||f._default&&f._default.apply(h.pop(),n)!==!1||!x.acceptData(r)||c&&x.isFunction(r[d])&&!x.isWindow(r)&&(u=r[c],u&&(r[c]=null),x.event.triggered=d,r[d](),x.event.triggered=undefined,u&&(r[c]=u)),t.result}},dispatch:function(e){e=x.event.fix(e);var t,n,r,i,o,s=[],a=d.call(arguments),u=(q.get(this,"events")||{})[e.type]||[],l=x.event.special[e.type]||{};if(a[0]=e,e.delegateTarget=this,!l.preDispatch||l.preDispatch.call(this,e)!==!1){s=x.event.handlers.call(this,e,u),t=0;while((i=s[t++])&&!e.isPropagationStopped()){e.currentTarget=i.elem,n=0;while((o=i.handlers[n++])&&!e.isImmediatePropagationStopped())(!e.namespace_re||e.namespace_re.test(o.namespace))&&(e.handleObj=o,e.data=o.data,r=((x.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,a),r!==undefined&&(e.result=r)===!1&&(e.preventDefault(),e.stopPropagation()))}return l.postDispatch&&l.postDispatch.call(this,e),e.result}},handlers:function(e,t){var n,r,i,o,s=[],a=t.delegateCount,u=e.target;if(a&&u.nodeType&&(!e.button||"click"!==e.type))for(;u!==this;u=u.parentNode||this)if(u.disabled!==!0||"click"!==e.type){for(r=[],n=0;a>n;n++)o=t[n],i=o.selector+" ",r[i]===undefined&&(r[i]=o.needsContext?x(i,this).index(u)>=0:x.find(i,this,null,[u]).length),r[i]&&r.push(o);r.length&&s.push({elem:u,handlers:r})}return t.length>a&&s.push({elem:this,handlers:t.slice(a)}),s},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,t){var n,r,i,s=t.button;return null==e.pageX&&null!=t.clientX&&(n=e.target.ownerDocument||o,r=n.documentElement,i=n.body,e.pageX=t.clientX+(r&&r.scrollLeft||i&&i.scrollLeft||0)-(r&&r.clientLeft||i&&i.clientLeft||0),e.pageY=t.clientY+(r&&r.scrollTop||i&&i.scrollTop||0)-(r&&r.clientTop||i&&i.clientTop||0)),e.which||s===undefined||(e.which=1&s?1:2&s?3:4&s?2:0),e}},fix:function(e){if(e[x.expando])return e;var t,n,r,i=e.type,s=e,a=this.fixHooks[i];a||(this.fixHooks[i]=a=z.test(i)?this.mouseHooks:I.test(i)?this.keyHooks:{}),r=a.props?this.props.concat(a.props):this.props,e=new x.Event(s),t=r.length;while(t--)n=r[t],e[n]=s[n];return e.target||(e.target=o),3===e.target.nodeType&&(e.target=e.target.parentNode),a.filter?a.filter(e,s):e},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==V()&&this.focus?(this.focus(),!1):undefined},delegateType:"focusin"},blur:{trigger:function(){return this===V()&&this.blur?(this.blur(),!1):undefined},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&x.nodeName(this,"input")?(this.click(),!1):undefined},_default:function(e){return x.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){e.result!==undefined&&(e.originalEvent.returnValue=e.result)}}},simulate:function(e,t,n,r){var i=x.extend(new x.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?x.event.trigger(i,null,t):x.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault()}},x.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1)},x.Event=function(e,t){return this instanceof x.Event?(e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.getPreventDefault&&e.getPreventDefault()?U:Y):this.type=e,t&&x.extend(this,t),this.timeStamp=e&&e.timeStamp||x.now(),this[x.expando]=!0,undefined):new x.Event(e,t)},x.Event.prototype={isDefaultPrevented:Y,isPropagationStopped:Y,isImmediatePropagationStopped:Y,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=U,e&&e.preventDefault&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=U,e&&e.stopPropagation&&e.stopPropagation()},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=U,this.stopPropagation()}},x.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){x.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return(!i||i!==r&&!x.contains(r,i))&&(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),x.support.focusinBubbles||x.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){x.event.simulate(t,e.target,x.event.fix(e),!0)};x.event.special[t]={setup:function(){0===n++&&o.addEventListener(e,r,!0)},teardown:function(){0===--n&&o.removeEventListener(e,r,!0)}}}),x.fn.extend({on:function(e,t,n,r,i){var o,s;if("object"==typeof e){"string"!=typeof t&&(n=n||t,t=undefined);for(s in e)this.on(s,t,n,e[s],i);return this}if(null==n&&null==r?(r=t,n=t=undefined):null==r&&("string"==typeof t?(r=n,n=undefined):(r=n,n=t,t=undefined)),r===!1)r=Y;else if(!r)return this;return 1===i&&(o=r,r=function(e){return x().off(e),o.apply(this,arguments)},r.guid=o.guid||(o.guid=x.guid++)),this.each(function(){x.event.add(this,e,r,n,t)})},one:function(e,t,n,r){return this.on(e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,x(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return(t===!1||"function"==typeof t)&&(n=t,t=undefined),n===!1&&(n=Y),this.each(function(){x.event.remove(this,e,n,t)})},trigger:function(e,t){return this.each(function(){x.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];return n?x.event.trigger(e,t,n,!0):undefined}});var G=/^.[^:#\[\.,]*$/,J=/^(?:parents|prev(?:Until|All))/,Q=x.expr.match.needsContext,K={children:!0,contents:!0,next:!0,prev:!0};x.fn.extend({find:function(e){var t,n=[],r=this,i=r.length;if("string"!=typeof e)return this.pushStack(x(e).filter(function(){for(t=0;i>t;t++)if(x.contains(r[t],this))return!0}));for(t=0;i>t;t++)x.find(e,r[t],n);return n=this.pushStack(i>1?x.unique(n):n),n.selector=this.selector?this.selector+" "+e:e,n},has:function(e){var t=x(e,this),n=t.length;return this.filter(function(){var e=0;for(;n>e;e++)if(x.contains(this,t[e]))return!0})},not:function(e){return this.pushStack(et(this,e||[],!0))},filter:function(e){return this.pushStack(et(this,e||[],!1))},is:function(e){return!!et(this,"string"==typeof e&&Q.test(e)?x(e):e||[],!1).length},closest:function(e,t){var n,r=0,i=this.length,o=[],s=Q.test(e)||"string"!=typeof e?x(e,t||this.context):0;for(;i>r;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(11>n.nodeType&&(s?s.index(n)>-1:1===n.nodeType&&x.find.matchesSelector(n,e))){n=o.push(n);break}return this.pushStack(o.length>1?x.unique(o):o)},index:function(e){return e?"string"==typeof e?g.call(x(e),this[0]):g.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){var n="string"==typeof e?x(e,t):x.makeArray(e&&e.nodeType?[e]:e),r=x.merge(this.get(),n);return this.pushStack(x.unique(r))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function Z(e,t){while((e=e[t])&&1!==e.nodeType);return e}x.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return x.dir(e,"parentNode")},parentsUntil:function(e,t,n){return x.dir(e,"parentNode",n)},next:function(e){return Z(e,"nextSibling")},prev:function(e){return Z(e,"previousSibling")},nextAll:function(e){return x.dir(e,"nextSibling")},prevAll:function(e){return x.dir(e,"previousSibling")},nextUntil:function(e,t,n){return x.dir(e,"nextSibling",n)},prevUntil:function(e,t,n){return x.dir(e,"previousSibling",n)},siblings:function(e){return x.sibling((e.parentNode||{}).firstChild,e)},children:function(e){return x.sibling(e.firstChild)},contents:function(e){return e.contentDocument||x.merge([],e.childNodes)}},function(e,t){x.fn[e]=function(n,r){var i=x.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=x.filter(r,i)),this.length>1&&(K[e]||x.unique(i),J.test(e)&&i.reverse()),this.pushStack(i)}}),x.extend({filter:function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?x.find.matchesSelector(r,e)?[r]:[]:x.find.matches(e,x.grep(t,function(e){return 1===e.nodeType}))},dir:function(e,t,n){var r=[],i=n!==undefined;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&x(e).is(n))break;r.push(e)}return r},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n}});function et(e,t,n){if(x.isFunction(t))return x.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return x.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(G.test(t))return x.filter(t,e,n);t=x.filter(t,e)}return x.grep(e,function(e){return g.call(t,e)>=0!==n})}var tt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,nt=/<([\w:]+)/,rt=/<|&#?\w+;/,it=/<(?:script|style|link)/i,ot=/^(?:checkbox|radio)$/i,st=/checked\s*(?:[^=]|=\s*.checked.)/i,at=/^$|\/(?:java|ecma)script/i,ut=/^true\/(.*)/,lt=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,ct={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ct.optgroup=ct.option,ct.tbody=ct.tfoot=ct.colgroup=ct.caption=ct.thead,ct.th=ct.td,x.fn.extend({text:function(e){return x.access(this,function(e){return e===undefined?x.text(this):this.empty().append((this[0]&&this[0].ownerDocument||o).createTextNode(e))},null,e,arguments.length)},append:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=pt(this,e);t.appendChild(e)}})},prepend:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=pt(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},remove:function(e,t){var n,r=e?x.filter(e,this):this,i=0;for(;null!=(n=r[i]);i++)t||1!==n.nodeType||x.cleanData(mt(n)),n.parentNode&&(t&&x.contains(n.ownerDocument,n)&&dt(mt(n,"script")),n.parentNode.removeChild(n));return this},empty:function(){var e,t=0;for(;null!=(e=this[t]);t++)1===e.nodeType&&(x.cleanData(mt(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null==e?!1:e,t=null==t?e:t,this.map(function(){return x.clone(this,e,t)})},html:function(e){return x.access(this,function(e){var t=this[0]||{},n=0,r=this.length;if(e===undefined&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!it.test(e)&&!ct[(nt.exec(e)||["",""])[1].toLowerCase()]){e=e.replace(tt,"<$1></$2>");try{for(;r>n;n++)t=this[n]||{},1===t.nodeType&&(x.cleanData(mt(t,!1)),t.innerHTML=e);t=0}catch(i){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=x.map(this,function(e){return[e.nextSibling,e.parentNode]}),t=0;return this.domManip(arguments,function(n){var r=e[t++],i=e[t++];i&&(r&&r.parentNode!==i&&(r=this.nextSibling),x(this).remove(),i.insertBefore(n,r))},!0),t?this:this.remove()},detach:function(e){return this.remove(e,!0)},domManip:function(e,t,n){e=f.apply([],e);var r,i,o,s,a,u,l=0,c=this.length,p=this,h=c-1,d=e[0],g=x.isFunction(d);if(g||!(1>=c||"string"!=typeof d||x.support.checkClone)&&st.test(d))return this.each(function(r){var i=p.eq(r);g&&(e[0]=d.call(this,r,i.html())),i.domManip(e,t,n)});if(c&&(r=x.buildFragment(e,this[0].ownerDocument,!1,!n&&this),i=r.firstChild,1===r.childNodes.length&&(r=i),i)){for(o=x.map(mt(r,"script"),ft),s=o.length;c>l;l++)a=r,l!==h&&(a=x.clone(a,!0,!0),s&&x.merge(o,mt(a,"script"))),t.call(this[l],a,l);if(s)for(u=o[o.length-1].ownerDocument,x.map(o,ht),l=0;s>l;l++)a=o[l],at.test(a.type||"")&&!q.access(a,"globalEval")&&x.contains(u,a)&&(a.src?x._evalUrl(a.src):x.globalEval(a.textContent.replace(lt,"")))}return this}}),x.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){x.fn[e]=function(e){var n,r=[],i=x(e),o=i.length-1,s=0;for(;o>=s;s++)n=s===o?this:this.clone(!0),x(i[s])[t](n),h.apply(r,n.get());return this.pushStack(r)}}),x.extend({clone:function(e,t,n){var r,i,o,s,a=e.cloneNode(!0),u=x.contains(e.ownerDocument,e);if(!(x.support.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||x.isXMLDoc(e)))for(s=mt(a),o=mt(e),r=0,i=o.length;i>r;r++)yt(o[r],s[r]);if(t)if(n)for(o=o||mt(e),s=s||mt(a),r=0,i=o.length;i>r;r++)gt(o[r],s[r]);else gt(e,a);return s=mt(a,"script"),s.length>0&&dt(s,!u&&mt(e,"script")),a},buildFragment:function(e,t,n,r){var i,o,s,a,u,l,c=0,p=e.length,f=t.createDocumentFragment(),h=[];for(;p>c;c++)if(i=e[c],i||0===i)if("object"===x.type(i))x.merge(h,i.nodeType?[i]:i);else if(rt.test(i)){o=o||f.appendChild(t.createElement("div")),s=(nt.exec(i)||["",""])[1].toLowerCase(),a=ct[s]||ct._default,o.innerHTML=a[1]+i.replace(tt,"<$1></$2>")+a[2],l=a[0];while(l--)o=o.lastChild;x.merge(h,o.childNodes),o=f.firstChild,o.textContent=""}else h.push(t.createTextNode(i));f.textContent="",c=0;while(i=h[c++])if((!r||-1===x.inArray(i,r))&&(u=x.contains(i.ownerDocument,i),o=mt(f.appendChild(i),"script"),u&&dt(o),n)){l=0;while(i=o[l++])at.test(i.type||"")&&n.push(i)}return f},cleanData:function(e){var t,n,r,i,o,s,a=x.event.special,u=0;for(;(n=e[u])!==undefined;u++){if(F.accepts(n)&&(o=n[q.expando],o&&(t=q.cache[o]))){if(r=Object.keys(t.events||{}),r.length)for(s=0;(i=r[s])!==undefined;s++)a[i]?x.event.remove(n,i):x.removeEvent(n,i,t.handle);q.cache[o]&&delete q.cache[o]}delete L.cache[n[L.expando]]}},_evalUrl:function(e){return x.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})}});function pt(e,t){return x.nodeName(e,"table")&&x.nodeName(1===t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function ft(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function ht(e){var t=ut.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function dt(e,t){var n=e.length,r=0;for(;n>r;r++)q.set(e[r],"globalEval",!t||q.get(t[r],"globalEval"))}function gt(e,t){var n,r,i,o,s,a,u,l;if(1===t.nodeType){if(q.hasData(e)&&(o=q.access(e),s=q.set(t,o),l=o.events)){delete s.handle,s.events={};for(i in l)for(n=0,r=l[i].length;r>n;n++)x.event.add(t,i,l[i][n])}L.hasData(e)&&(a=L.access(e),u=x.extend({},a),L.set(t,u))}}function mt(e,t){var n=e.getElementsByTagName?e.getElementsByTagName(t||"*"):e.querySelectorAll?e.querySelectorAll(t||"*"):[];return t===undefined||t&&x.nodeName(e,t)?x.merge([e],n):n}function yt(e,t){var n=t.nodeName.toLowerCase();"input"===n&&ot.test(e.type)?t.checked=e.checked:("input"===n||"textarea"===n)&&(t.defaultValue=e.defaultValue)}x.fn.extend({wrapAll:function(e){var t;return x.isFunction(e)?this.each(function(t){x(this).wrapAll(e.call(this,t))}):(this[0]&&(t=x(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this)},wrapInner:function(e){return x.isFunction(e)?this.each(function(t){x(this).wrapInner(e.call(this,t))}):this.each(function(){var t=x(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=x.isFunction(e);return this.each(function(n){x(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){x.nodeName(this,"body")||x(this).replaceWith(this.childNodes)}).end()}});var vt,xt,bt=/^(none|table(?!-c[ea]).+)/,wt=/^margin/,Tt=RegExp("^("+b+")(.*)$","i"),Ct=RegExp("^("+b+")(?!px)[a-z%]+$","i"),kt=RegExp("^([+-])=("+b+")","i"),Nt={BODY:"block"},Et={position:"absolute",visibility:"hidden",display:"block"},St={letterSpacing:0,fontWeight:400},jt=["Top","Right","Bottom","Left"],Dt=["Webkit","O","Moz","ms"];function At(e,t){if(t in e)return t;var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=Dt.length;while(i--)if(t=Dt[i]+n,t in e)return t;return r}function Lt(e,t){return e=t||e,"none"===x.css(e,"display")||!x.contains(e.ownerDocument,e)}function qt(t){return e.getComputedStyle(t,null)}function Ht(e,t){var n,r,i,o=[],s=0,a=e.length;for(;a>s;s++)r=e[s],r.style&&(o[s]=q.get(r,"olddisplay"),n=r.style.display,t?(o[s]||"none"!==n||(r.style.display=""),""===r.style.display&&Lt(r)&&(o[s]=q.access(r,"olddisplay",Rt(r.nodeName)))):o[s]||(i=Lt(r),(n&&"none"!==n||!i)&&q.set(r,"olddisplay",i?n:x.css(r,"display"))));for(s=0;a>s;s++)r=e[s],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[s]||"":"none"));return e}x.fn.extend({css:function(e,t){return x.access(this,function(e,t,n){var r,i,o={},s=0;if(x.isArray(t)){for(r=qt(e),i=t.length;i>s;s++)o[t[s]]=x.css(e,t[s],!1,r);return o}return n!==undefined?x.style(e,t,n):x.css(e,t)},e,t,arguments.length>1)},show:function(){return Ht(this,!0)},hide:function(){return Ht(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){Lt(this)?x(this).show():x(this).hide()})}}),x.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=vt(e,"opacity");return""===n?"1":n}}}},cssNumber:{columnCount:!0,fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,s,a=x.camelCase(t),u=e.style;return t=x.cssProps[a]||(x.cssProps[a]=At(u,a)),s=x.cssHooks[t]||x.cssHooks[a],n===undefined?s&&"get"in s&&(i=s.get(e,!1,r))!==undefined?i:u[t]:(o=typeof n,"string"===o&&(i=kt.exec(n))&&(n=(i[1]+1)*i[2]+parseFloat(x.css(e,t)),o="number"),null==n||"number"===o&&isNaN(n)||("number"!==o||x.cssNumber[a]||(n+="px"),x.support.clearCloneStyle||""!==n||0!==t.indexOf("background")||(u[t]="inherit"),s&&"set"in s&&(n=s.set(e,n,r))===undefined||(u[t]=n)),undefined)}},css:function(e,t,n,r){var i,o,s,a=x.camelCase(t);return t=x.cssProps[a]||(x.cssProps[a]=At(e.style,a)),s=x.cssHooks[t]||x.cssHooks[a],s&&"get"in s&&(i=s.get(e,!0,n)),i===undefined&&(i=vt(e,t,r)),"normal"===i&&t in St&&(i=St[t]),""===n||n?(o=parseFloat(i),n===!0||x.isNumeric(o)?o||0:i):i}}),vt=function(e,t,n){var r,i,o,s=n||qt(e),a=s?s.getPropertyValue(t)||s[t]:undefined,u=e.style;return s&&(""!==a||x.contains(e.ownerDocument,e)||(a=x.style(e,t)),Ct.test(a)&&wt.test(t)&&(r=u.width,i=u.minWidth,o=u.maxWidth,u.minWidth=u.maxWidth=u.width=a,a=s.width,u.width=r,u.minWidth=i,u.maxWidth=o)),a};function Ot(e,t,n){var r=Tt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t}function Ft(e,t,n,r,i){var o=n===(r?"border":"content")?4:"width"===t?1:0,s=0;for(;4>o;o+=2)"margin"===n&&(s+=x.css(e,n+jt[o],!0,i)),r?("content"===n&&(s-=x.css(e,"padding"+jt[o],!0,i)),"margin"!==n&&(s-=x.css(e,"border"+jt[o]+"Width",!0,i))):(s+=x.css(e,"padding"+jt[o],!0,i),"padding"!==n&&(s+=x.css(e,"border"+jt[o]+"Width",!0,i)));return s}function Pt(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=qt(e),s=x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,o);if(0>=i||null==i){if(i=vt(e,t,o),(0>i||null==i)&&(i=e.style[t]),Ct.test(i))return i;r=s&&(x.support.boxSizingReliable||i===e.style[t]),i=parseFloat(i)||0}return i+Ft(e,t,n||(s?"border":"content"),r,o)+"px"}function Rt(e){var t=o,n=Nt[e];return n||(n=Mt(e,t),"none"!==n&&n||(xt=(xt||x("<iframe frameborder='0' width='0' height='0'/>").css("cssText","display:block !important")).appendTo(t.documentElement),t=(xt[0].contentWindow||xt[0].contentDocument).document,t.write("<!doctype html><html><body>"),t.close(),n=Mt(e,t),xt.detach()),Nt[e]=n),n}function Mt(e,t){var n=x(t.createElement(e)).appendTo(t.body),r=x.css(n[0],"display");return n.remove(),r}x.each(["height","width"],function(e,t){x.cssHooks[t]={get:function(e,n,r){return n?0===e.offsetWidth&&bt.test(x.css(e,"display"))?x.swap(e,Et,function(){return Pt(e,t,r)}):Pt(e,t,r):undefined},set:function(e,n,r){var i=r&&qt(e);return Ot(e,n,r?Ft(e,t,r,x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,i),i):0)}}}),x(function(){x.support.reliableMarginRight||(x.cssHooks.marginRight={get:function(e,t){return t?x.swap(e,{display:"inline-block"},vt,[e,"marginRight"]):undefined}}),!x.support.pixelPosition&&x.fn.position&&x.each(["top","left"],function(e,t){x.cssHooks[t]={get:function(e,n){return n?(n=vt(e,t),Ct.test(n)?x(e).position()[t]+"px":n):undefined}}})}),x.expr&&x.expr.filters&&(x.expr.filters.hidden=function(e){return 0>=e.offsetWidth&&0>=e.offsetHeight},x.expr.filters.visible=function(e){return!x.expr.filters.hidden(e)}),x.each({margin:"",padding:"",border:"Width"},function(e,t){x.cssHooks[e+t]={expand:function(n){var r=0,i={},o="string"==typeof n?n.split(" "):[n];for(;4>r;r++)i[e+jt[r]+t]=o[r]||o[r-2]||o[0];return i}},wt.test(e)||(x.cssHooks[e+t].set=Ot)});var Wt=/%20/g,$t=/\[\]$/,Bt=/\r?\n/g,It=/^(?:submit|button|image|reset|file)$/i,zt=/^(?:input|select|textarea|keygen)/i;x.fn.extend({serialize:function(){return x.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=x.prop(this,"elements");return e?x.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!x(this).is(":disabled")&&zt.test(this.nodeName)&&!It.test(e)&&(this.checked||!ot.test(e))}).map(function(e,t){var n=x(this).val();return null==n?null:x.isArray(n)?x.map(n,function(e){return{name:t.name,value:e.replace(Bt,"\r\n")}}):{name:t.name,value:n.replace(Bt,"\r\n")}}).get()}}),x.param=function(e,t){var n,r=[],i=function(e,t){t=x.isFunction(t)?t():null==t?"":t,r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(t===undefined&&(t=x.ajaxSettings&&x.ajaxSettings.traditional),x.isArray(e)||e.jquery&&!x.isPlainObject(e))x.each(e,function(){i(this.name,this.value)});else for(n in e)_t(n,e[n],t,i);return r.join("&").replace(Wt,"+")};function _t(e,t,n,r){var i;if(x.isArray(t))x.each(t,function(t,i){n||$t.test(e)?r(e,i):_t(e+"["+("object"==typeof i?t:"")+"]",i,n,r)});else if(n||"object"!==x.type(t))r(e,t);else for(i in t)_t(e+"["+i+"]",t[i],n,r)}x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){x.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),x.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)},bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)
	},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}});var Xt,Ut,Yt=x.now(),Vt=/\?/,Gt=/#.*$/,Jt=/([?&])_=[^&]*/,Qt=/^(.*?):[ \t]*([^\r\n]*)$/gm,Kt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Zt=/^(?:GET|HEAD)$/,en=/^\/\//,tn=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,nn=x.fn.load,rn={},on={},sn="*/".concat("*");try{Ut=i.href}catch(an){Ut=o.createElement("a"),Ut.href="",Ut=Ut.href}Xt=tn.exec(Ut.toLowerCase())||[];function un(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(w)||[];if(x.isFunction(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function ln(e,t,n,r){var i={},o=e===on;function s(a){var u;return i[a]=!0,x.each(e[a]||[],function(e,a){var l=a(t,n,r);return"string"!=typeof l||o||i[l]?o?!(u=l):undefined:(t.dataTypes.unshift(l),s(l),!1)}),u}return s(t.dataTypes[0])||!i["*"]&&s("*")}function cn(e,t){var n,r,i=x.ajaxSettings.flatOptions||{};for(n in t)t[n]!==undefined&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&x.extend(!0,e,r),e}x.fn.load=function(e,t,n){if("string"!=typeof e&&nn)return nn.apply(this,arguments);var r,i,o,s=this,a=e.indexOf(" ");return a>=0&&(r=e.slice(a),e=e.slice(0,a)),x.isFunction(t)?(n=t,t=undefined):t&&"object"==typeof t&&(i="POST"),s.length>0&&x.ajax({url:e,type:i,dataType:"html",data:t}).done(function(e){o=arguments,s.html(r?x("<div>").append(x.parseHTML(e)).find(r):e)}).complete(n&&function(e,t){s.each(n,o||[e.responseText,t,e])}),this},x.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){x.fn[t]=function(e){return this.on(t,e)}}),x.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Ut,type:"GET",isLocal:Kt.test(Xt[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":sn,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":x.parseJSON,"text xml":x.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?cn(cn(e,x.ajaxSettings),t):cn(x.ajaxSettings,e)},ajaxPrefilter:un(rn),ajaxTransport:un(on),ajax:function(e,t){"object"==typeof e&&(t=e,e=undefined),t=t||{};var n,r,i,o,s,a,u,l,c=x.ajaxSetup({},t),p=c.context||c,f=c.context&&(p.nodeType||p.jquery)?x(p):x.event,h=x.Deferred(),d=x.Callbacks("once memory"),g=c.statusCode||{},m={},y={},v=0,b="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(2===v){if(!o){o={};while(t=Qt.exec(i))o[t[1].toLowerCase()]=t[2]}t=o[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===v?i:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return v||(e=y[n]=y[n]||e,m[e]=t),this},overrideMimeType:function(e){return v||(c.mimeType=e),this},statusCode:function(e){var t;if(e)if(2>v)for(t in e)g[t]=[g[t],e[t]];else T.always(e[T.status]);return this},abort:function(e){var t=e||b;return n&&n.abort(t),k(0,t),this}};if(h.promise(T).complete=d.add,T.success=T.done,T.error=T.fail,c.url=((e||c.url||Ut)+"").replace(Gt,"").replace(en,Xt[1]+"//"),c.type=t.method||t.type||c.method||c.type,c.dataTypes=x.trim(c.dataType||"*").toLowerCase().match(w)||[""],null==c.crossDomain&&(a=tn.exec(c.url.toLowerCase()),c.crossDomain=!(!a||a[1]===Xt[1]&&a[2]===Xt[2]&&(a[3]||("http:"===a[1]?"80":"443"))===(Xt[3]||("http:"===Xt[1]?"80":"443")))),c.data&&c.processData&&"string"!=typeof c.data&&(c.data=x.param(c.data,c.traditional)),ln(rn,c,t,T),2===v)return T;u=c.global,u&&0===x.active++&&x.event.trigger("ajaxStart"),c.type=c.type.toUpperCase(),c.hasContent=!Zt.test(c.type),r=c.url,c.hasContent||(c.data&&(r=c.url+=(Vt.test(r)?"&":"?")+c.data,delete c.data),c.cache===!1&&(c.url=Jt.test(r)?r.replace(Jt,"$1_="+Yt++):r+(Vt.test(r)?"&":"?")+"_="+Yt++)),c.ifModified&&(x.lastModified[r]&&T.setRequestHeader("If-Modified-Since",x.lastModified[r]),x.etag[r]&&T.setRequestHeader("If-None-Match",x.etag[r])),(c.data&&c.hasContent&&c.contentType!==!1||t.contentType)&&T.setRequestHeader("Content-Type",c.contentType),T.setRequestHeader("Accept",c.dataTypes[0]&&c.accepts[c.dataTypes[0]]?c.accepts[c.dataTypes[0]]+("*"!==c.dataTypes[0]?", "+sn+"; q=0.01":""):c.accepts["*"]);for(l in c.headers)T.setRequestHeader(l,c.headers[l]);if(c.beforeSend&&(c.beforeSend.call(p,T,c)===!1||2===v))return T.abort();b="abort";for(l in{success:1,error:1,complete:1})T[l](c[l]);if(n=ln(on,c,t,T)){T.readyState=1,u&&f.trigger("ajaxSend",[T,c]),c.async&&c.timeout>0&&(s=setTimeout(function(){T.abort("timeout")},c.timeout));try{v=1,n.send(m,k)}catch(C){if(!(2>v))throw C;k(-1,C)}}else k(-1,"No Transport");function k(e,t,o,a){var l,m,y,b,w,C=t;2!==v&&(v=2,s&&clearTimeout(s),n=undefined,i=a||"",T.readyState=e>0?4:0,l=e>=200&&300>e||304===e,o&&(b=pn(c,T,o)),b=fn(c,b,T,l),l?(c.ifModified&&(w=T.getResponseHeader("Last-Modified"),w&&(x.lastModified[r]=w),w=T.getResponseHeader("etag"),w&&(x.etag[r]=w)),204===e||"HEAD"===c.type?C="nocontent":304===e?C="notmodified":(C=b.state,m=b.data,y=b.error,l=!y)):(y=C,(e||!C)&&(C="error",0>e&&(e=0))),T.status=e,T.statusText=(t||C)+"",l?h.resolveWith(p,[m,C,T]):h.rejectWith(p,[T,C,y]),T.statusCode(g),g=undefined,u&&f.trigger(l?"ajaxSuccess":"ajaxError",[T,c,l?m:y]),d.fireWith(p,[T,C]),u&&(f.trigger("ajaxComplete",[T,c]),--x.active||x.event.trigger("ajaxStop")))}return T},getJSON:function(e,t,n){return x.get(e,t,n,"json")},getScript:function(e,t){return x.get(e,undefined,t,"script")}}),x.each(["get","post"],function(e,t){x[t]=function(e,n,r,i){return x.isFunction(n)&&(i=i||r,r=n,n=undefined),x.ajax({url:e,type:t,dataType:i,data:n,success:r})}});function pn(e,t,n){var r,i,o,s,a=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),r===undefined&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in a)if(a[i]&&a[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}s||(s=i)}o=o||s}return o?(o!==u[0]&&u.unshift(o),n[o]):undefined}function fn(e,t,n,r){var i,o,s,a,u,l={},c=e.dataTypes.slice();if(c[1])for(s in e.converters)l[s.toLowerCase()]=e.converters[s];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(s=l[u+" "+o]||l["* "+o],!s)for(i in l)if(a=i.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){s===!0?s=l[i]:l[i]!==!0&&(o=a[0],c.unshift(a[1]));break}if(s!==!0)if(s&&e["throws"])t=s(t);else try{t=s(t)}catch(p){return{state:"parsererror",error:s?p:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}x.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(e){return x.globalEval(e),e}}}),x.ajaxPrefilter("script",function(e){e.cache===undefined&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),x.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(r,i){t=x("<script>").prop({async:!0,charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&i("error"===e.type?404:200,e.type)}),o.head.appendChild(t[0])},abort:function(){n&&n()}}}});var hn=[],dn=/(=)\?(?=&|$)|\?\?/;x.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=hn.pop()||x.expando+"_"+Yt++;return this[e]=!0,e}}),x.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,s,a=t.jsonp!==!1&&(dn.test(t.url)?"url":"string"==typeof t.data&&!(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&dn.test(t.data)&&"data");return a||"jsonp"===t.dataTypes[0]?(i=t.jsonpCallback=x.isFunction(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,a?t[a]=t[a].replace(dn,"$1"+i):t.jsonp!==!1&&(t.url+=(Vt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return s||x.error(i+" was not called"),s[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){s=arguments},r.always(function(){e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,hn.push(i)),s&&x.isFunction(o)&&o(s[0]),s=o=undefined}),"script"):undefined}),x.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(e){}};var gn=x.ajaxSettings.xhr(),mn={0:200,1223:204},yn=0,vn={};e.ActiveXObject&&x(e).on("unload",function(){for(var e in vn)vn[e]();vn=undefined}),x.support.cors=!!gn&&"withCredentials"in gn,x.support.ajax=gn=!!gn,x.ajaxTransport(function(e){var t;return x.support.cors||gn&&!e.crossDomain?{send:function(n,r){var i,o,s=e.xhr();if(s.open(e.type,e.url,e.async,e.username,e.password),e.xhrFields)for(i in e.xhrFields)s[i]=e.xhrFields[i];e.mimeType&&s.overrideMimeType&&s.overrideMimeType(e.mimeType),e.crossDomain||n["X-Requested-With"]||(n["X-Requested-With"]="XMLHttpRequest");for(i in n)s.setRequestHeader(i,n[i]);t=function(e){return function(){t&&(delete vn[o],t=s.onload=s.onerror=null,"abort"===e?s.abort():"error"===e?r(s.status||404,s.statusText):r(mn[s.status]||s.status,s.statusText,"string"==typeof s.responseText?{text:s.responseText}:undefined,s.getAllResponseHeaders()))}},s.onload=t(),s.onerror=t("error"),t=vn[o=yn++]=t("abort"),s.send(e.hasContent&&e.data||null)},abort:function(){t&&t()}}:undefined});var xn,bn,wn=/^(?:toggle|show|hide)$/,Tn=RegExp("^(?:([+-])=|)("+b+")([a-z%]*)$","i"),Cn=/queueHooks$/,kn=[An],Nn={"*":[function(e,t){var n=this.createTween(e,t),r=n.cur(),i=Tn.exec(t),o=i&&i[3]||(x.cssNumber[e]?"":"px"),s=(x.cssNumber[e]||"px"!==o&&+r)&&Tn.exec(x.css(n.elem,e)),a=1,u=20;if(s&&s[3]!==o){o=o||s[3],i=i||[],s=+r||1;do a=a||".5",s/=a,x.style(n.elem,e,s+o);while(a!==(a=n.cur()/r)&&1!==a&&--u)}return i&&(s=n.start=+s||+r||0,n.unit=o,n.end=i[1]?s+(i[1]+1)*i[2]:+i[2]),n}]};function En(){return setTimeout(function(){xn=undefined}),xn=x.now()}function Sn(e,t,n){var r,i=(Nn[t]||[]).concat(Nn["*"]),o=0,s=i.length;for(;s>o;o++)if(r=i[o].call(n,t,e))return r}function jn(e,t,n){var r,i,o=0,s=kn.length,a=x.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;var t=xn||En(),n=Math.max(0,l.startTime+l.duration-t),r=n/l.duration||0,o=1-r,s=0,u=l.tweens.length;for(;u>s;s++)l.tweens[s].run(o);return a.notifyWith(e,[l,o,n]),1>o&&u?n:(a.resolveWith(e,[l]),!1)},l=a.promise({elem:e,props:x.extend({},t),opts:x.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:xn||En(),duration:n.duration,tweens:[],createTween:function(t,n){var r=x.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;r>n;n++)l.tweens[n].run(1);return t?a.resolveWith(e,[l,t]):a.rejectWith(e,[l,t]),this}}),c=l.props;for(Dn(c,l.opts.specialEasing);s>o;o++)if(r=kn[o].call(l,e,c,l.opts))return r;return x.map(c,Sn,l),x.isFunction(l.opts.start)&&l.opts.start.call(e,l),x.fx.timer(x.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always)}function Dn(e,t){var n,r,i,o,s;for(n in e)if(r=x.camelCase(n),i=t[r],o=e[n],x.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),s=x.cssHooks[r],s&&"expand"in s){o=s.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}x.Animation=x.extend(jn,{tweener:function(e,t){x.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;i>r;r++)n=e[r],Nn[n]=Nn[n]||[],Nn[n].unshift(t)},prefilter:function(e,t){t?kn.unshift(e):kn.push(e)}});function An(e,t,n){var r,i,o,s,a,u,l=this,c={},p=e.style,f=e.nodeType&&Lt(e),h=q.get(e,"fxshow");n.queue||(a=x._queueHooks(e,"fx"),null==a.unqueued&&(a.unqueued=0,u=a.empty.fire,a.empty.fire=function(){a.unqueued||u()}),a.unqueued++,l.always(function(){l.always(function(){a.unqueued--,x.queue(e,"fx").length||a.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],"inline"===x.css(e,"display")&&"none"===x.css(e,"float")&&(p.display="inline-block")),n.overflow&&(p.overflow="hidden",l.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t)if(i=t[r],wn.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(f?"hide":"show")){if("show"!==i||!h||h[r]===undefined)continue;f=!0}c[r]=h&&h[r]||x.style(e,r)}if(!x.isEmptyObject(c)){h?"hidden"in h&&(f=h.hidden):h=q.access(e,"fxshow",{}),o&&(h.hidden=!f),f?x(e).show():l.done(function(){x(e).hide()}),l.done(function(){var t;q.remove(e,"fxshow");for(t in c)x.style(e,t,c[t])});for(r in c)s=Sn(f?h[r]:0,r,l),r in h||(h[r]=s.start,f&&(s.end=s.start,s.start="width"===r||"height"===r?1:0))}}function Ln(e,t,n,r,i){return new Ln.prototype.init(e,t,n,r,i)}x.Tween=Ln,Ln.prototype={constructor:Ln,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(x.cssNumber[n]?"":"px")},cur:function(){var e=Ln.propHooks[this.prop];return e&&e.get?e.get(this):Ln.propHooks._default.get(this)},run:function(e){var t,n=Ln.propHooks[this.prop];return this.pos=t=this.options.duration?x.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):Ln.propHooks._default.set(this),this}},Ln.prototype.init.prototype=Ln.prototype,Ln.propHooks={_default:{get:function(e){var t;return null==e.elem[e.prop]||e.elem.style&&null!=e.elem.style[e.prop]?(t=x.css(e.elem,e.prop,""),t&&"auto"!==t?t:0):e.elem[e.prop]},set:function(e){x.fx.step[e.prop]?x.fx.step[e.prop](e):e.elem.style&&(null!=e.elem.style[x.cssProps[e.prop]]||x.cssHooks[e.prop])?x.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now}}},Ln.propHooks.scrollTop=Ln.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},x.each(["toggle","show","hide"],function(e,t){var n=x.fn[t];x.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(qn(t,!0),e,r,i)}}),x.fn.extend({fadeTo:function(e,t,n,r){return this.filter(Lt).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=x.isEmptyObject(e),o=x.speed(t,n,r),s=function(){var t=jn(this,x.extend({},e),o);(i||q.get(this,"finish"))&&t.stop(!0)};return s.finish=s,i||o.queue===!1?this.each(s):this.queue(o.queue,s)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=undefined),t&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=x.timers,s=q.get(this);if(i)s[i]&&s[i].stop&&r(s[i]);else for(i in s)s[i]&&s[i].stop&&Cn.test(i)&&r(s[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));(t||!n)&&x.dequeue(this,e)})},finish:function(e){return e!==!1&&(e=e||"fx"),this.each(function(){var t,n=q.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=x.timers,s=r?r.length:0;for(n.finish=!0,x.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;s>t;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}});function qn(e,t){var n,r={height:e},i=0;for(t=t?1:0;4>i;i+=2-t)n=jt[i],r["margin"+n]=r["padding"+n]=e;return t&&(r.opacity=r.width=e),r}x.each({slideDown:qn("show"),slideUp:qn("hide"),slideToggle:qn("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){x.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),x.speed=function(e,t,n){var r=e&&"object"==typeof e?x.extend({},e):{complete:n||!n&&t||x.isFunction(e)&&e,duration:e,easing:n&&t||t&&!x.isFunction(t)&&t};return r.duration=x.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in x.fx.speeds?x.fx.speeds[r.duration]:x.fx.speeds._default,(null==r.queue||r.queue===!0)&&(r.queue="fx"),r.old=r.complete,r.complete=function(){x.isFunction(r.old)&&r.old.call(this),r.queue&&x.dequeue(this,r.queue)},r},x.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2}},x.timers=[],x.fx=Ln.prototype.init,x.fx.tick=function(){var e,t=x.timers,n=0;for(xn=x.now();t.length>n;n++)e=t[n],e()||t[n]!==e||t.splice(n--,1);t.length||x.fx.stop(),xn=undefined},x.fx.timer=function(e){e()&&x.timers.push(e)&&x.fx.start()},x.fx.interval=13,x.fx.start=function(){bn||(bn=setInterval(x.fx.tick,x.fx.interval))},x.fx.stop=function(){clearInterval(bn),bn=null},x.fx.speeds={slow:600,fast:200,_default:400},x.fx.step={},x.expr&&x.expr.filters&&(x.expr.filters.animated=function(e){return x.grep(x.timers,function(t){return e===t.elem}).length}),x.fn.offset=function(e){if(arguments.length)return e===undefined?this:this.each(function(t){x.offset.setOffset(this,e,t)});var t,n,i=this[0],o={top:0,left:0},s=i&&i.ownerDocument;if(s)return t=s.documentElement,x.contains(t,i)?(typeof i.getBoundingClientRect!==r&&(o=i.getBoundingClientRect()),n=Hn(s),{top:o.top+n.pageYOffset-t.clientTop,left:o.left+n.pageXOffset-t.clientLeft}):o},x.offset={setOffset:function(e,t,n){var r,i,o,s,a,u,l,c=x.css(e,"position"),p=x(e),f={};"static"===c&&(e.style.position="relative"),a=p.offset(),o=x.css(e,"top"),u=x.css(e,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(r=p.position(),s=r.top,i=r.left):(s=parseFloat(o)||0,i=parseFloat(u)||0),x.isFunction(t)&&(t=t.call(e,n,a)),null!=t.top&&(f.top=t.top-a.top+s),null!=t.left&&(f.left=t.left-a.left+i),"using"in t?t.using.call(e,f):p.css(f)}},x.fn.extend({position:function(){if(this[0]){var e,t,n=this[0],r={top:0,left:0};return"fixed"===x.css(n,"position")?t=n.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),x.nodeName(e[0],"html")||(r=e.offset()),r.top+=x.css(e[0],"borderTopWidth",!0),r.left+=x.css(e[0],"borderLeftWidth",!0)),{top:t.top-r.top-x.css(n,"marginTop",!0),left:t.left-r.left-x.css(n,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||s;while(e&&!x.nodeName(e,"html")&&"static"===x.css(e,"position"))e=e.offsetParent;return e||s})}}),x.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(t,n){var r="pageYOffset"===n;x.fn[t]=function(i){return x.access(this,function(t,i,o){var s=Hn(t);return o===undefined?s?s[n]:t[i]:(s?s.scrollTo(r?e.pageXOffset:o,r?o:e.pageYOffset):t[i]=o,undefined)},t,i,arguments.length,null)}});function Hn(e){return x.isWindow(e)?e:9===e.nodeType&&e.defaultView}x.each({Height:"height",Width:"width"},function(e,t){x.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){x.fn[r]=function(r,i){var o=arguments.length&&(n||"boolean"!=typeof r),s=n||(r===!0||i===!0?"margin":"border");return x.access(this,function(t,n,r){var i;return x.isWindow(t)?t.document.documentElement["client"+e]:9===t.nodeType?(i=t.documentElement,Math.max(t.body["scroll"+e],i["scroll"+e],t.body["offset"+e],i["offset"+e],i["client"+e])):r===undefined?x.css(t,n,s):x.style(t,n,r,s)},t,o?r:undefined,o,null)}})}),x.fn.size=function(){return this.length},x.fn.andSelf=x.fn.addBack,"object"==typeof module&&module&&"object"==typeof module.exports?module.exports=x:"function"=="function"&&__webpack_require__(17)&&!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function(){return x}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)),"object"==typeof e&&"object"==typeof e.document&&(e.jQuery=e.$=x)})(window);
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)(module)))

/***/ },
/* 16 */
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


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {module.exports = __webpack_amd_options__;
	
	/* WEBPACK VAR INJECTION */}.call(exports, {}))

/***/ }
/******/ ])