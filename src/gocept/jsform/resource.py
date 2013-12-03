import fanstatic
import js.jquery
import js.json_template
import js.knockout
import os.path


def render_template(library, inner):
    filename = os.path.basename(inner)
    path = os.path.join(library.path, filename)
    with open(path) as f:
        inner = f.read()
    return '<script type="text/html" id="{}">{}</script>'.format(
        os.path.splitext(filename)[0], inner)


library = fanstatic.Library('gocept.jsform', 'resources')


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

object_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_object.pt', renderer=template_renderer)

boolean_template = fanstatic.Resource(
    library, 'gocept_jsform_templates_boolean.pt', renderer=template_renderer)

templates = fanstatic.Group([
    form_template, string_template, object_template, boolean_template])

jsform = fanstatic.Resource(
    library, 'jsform.js', minified='jsform.min.js',
    depends=[helpers, js.json_template.json_template, templates])
