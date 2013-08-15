import fanstatic
import js.jquery
import js.knockout


MINIFIERS = {'.js': 'jsmin'}


library = fanstatic.Library(
    'gocept.jsform', 'resources', minifiers=MINIFIERS)

ko_mapping = fanstatic.Resource(
    library, 'ko.mapping.js', depends=[js.knockout.knockout])

helpers = fanstatic.Resource(
    library, 'helpers.js', depends=[js.jquery.jquery, ko_mapping])

json_template = fanstatic.Resource(library, 'json-template.js')

widgets = fanstatic.Resource(library, 'widgets.js', depends=[
    helpers, json_template])

jsform = fanstatic.Resource(library, 'jsform.js', depends=[widgets])
