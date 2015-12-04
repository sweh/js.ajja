import fanstatic
import js.classy
import js.jquery
import js.knockout
import os.path

try:
    import js.bootstrap
    import js.jqueryui
except ImportError:
    HAS_LISTWIDGET_DEPENDENCIES = False
else:
    HAS_LISTWIDGET_DEPENDENCIES = True


def render_template(library, inner):
    filename = os.path.basename(inner)
    path = os.path.join(library.path, filename)
    with open(path) as f:
        inner = f.read()
    return '<script type="text/html" id="{}">{}</script>'.format(
        os.path.splitext(filename)[0], inner)


library = fanstatic.Library('gocept.jsform', 'resources')


handlebars = fanstatic.Resource(library, 'handlebars-v4.0.2.js')


def template_renderer(inner):
    return render_template(library, inner)


ko_mapping = fanstatic.Resource(
    library, 'ko.mapping.js', minified='ko.mapping.min.js',
    depends=[js.knockout.knockout])

helpers = fanstatic.Resource(
    library, 'helpers.js', minified='helpers.min.js',
    depends=[js.jquery.jquery, ko_mapping])


form_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_form.pt', renderer=template_renderer)

string_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_string.pt', renderer=template_renderer)

text_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_text.pt', renderer=template_renderer)

object_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_object.pt', renderer=template_renderer)

boolean_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_boolean.pt', renderer=template_renderer)

radio_list_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_radio_list.pt',
    renderer=template_renderer)

multiselect_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_multiselect.pt',
    renderer=template_renderer)

wrapper_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_field_wrapper.pt',
    renderer=template_renderer)

templates = fanstatic.Group([
    form_template, string_template, text_template,
    object_template, boolean_template, radio_list_template,
    multiselect_template, wrapper_template])

jsform = fanstatic.Resource(
    library, 'jsform.js', minified='jsform.min.js',
    depends=[
        helpers,
        js.classy.classy,
        handlebars,
        js.jquery.jquery,
        templates,
    ])

if HAS_LISTWIDGET_DEPENDENCIES is True:

    list_template = fanstatic.Resource(
        library, 'gocept_jsform_list.pt',
        renderer=template_renderer)

    list_item_template = fanstatic.Resource(
        library, 'gocept_jsform_list_item.pt',
        renderer=template_renderer)

    list_item_wrapper_template = fanstatic.Resource(
        library, 'gocept_jsform_list_item_wrapper.pt',
        renderer=template_renderer)

    list_item_action_template = fanstatic.Resource(
        library, 'gocept_jsform_list_item_action.pt',
        renderer=template_renderer)

    list_item_edit_template = fanstatic.Resource(
        library, 'gocept_jsform_list_item_edit.pt',
        renderer=template_renderer)

    list_templates = fanstatic.Group([
        list_item_action_template,
        list_item_edit_template,
        list_item_template,
        list_item_wrapper_template,
        list_template,
    ])

    list_widget = fanstatic.Resource(
        library, 'list.js', minified='list.min.js',
        depends=[
            js.bootstrap.bootstrap_css,
            js.bootstrap.bootstrap_js,
            js.jquery.jquery,
            js.jqueryui.bootstrap,
            jsform,
            list_templates,
        ])
