
import gocept.jasmine.resource
import fanstatic


library = fanstatic.Library('gocept.jsform.tests', 'resources')
integration_test = fanstatic.Resource(
    library, 'integration.js', depends=[gocept.jasmine.resource.jasmine])
