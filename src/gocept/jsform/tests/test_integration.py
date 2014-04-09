# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

import fanstatic
import gocept.jasmine.jasmine
import gocept.jasmine.resource
import gocept.jsform
import os


library = fanstatic.Library('gocept.jsform.tests', 'resources')
integration_test = fanstatic.Resource(
    library, 'integration.js', depends=[gocept.jasmine.resource.jasmine])


# Register this library programmatically to avoid making the package metadata
# depend on test-only dependencies.
fanstatic.get_library_registry().add(library)


class JSFormApp(gocept.jasmine.jasmine.TestApp):

    def need_resources(self):
        gocept.jsform.jsform.need()
        integration_test.need()

    @property
    def body(self):
        return '<div id="my_form"></div>'


class JSFormTestCase(gocept.jasmine.jasmine.TestCase):

    layer = gocept.jasmine.jasmine.get_layer(JSFormApp())
    debug = os.environ.get('JASMINE_DEBUG', False)

    def test_integration(self):
        self.run_jasmine()
