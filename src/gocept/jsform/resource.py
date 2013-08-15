import fanstatic
import js.jquery
import js.knockout


MINIFIERS = {'.js': 'jsmin'}


library = fanstatic.Library(
    'gocept.jsform', 'resources', minifiers=MINIFIERS)

helpers = fanstatic.Resource(
    library, 'helpers.js', depends=[js.jquery.jquery, js.knockout.knockout])

jsform = fanstatic.Resource(library, 'jsform.js', depends=[helpers])
