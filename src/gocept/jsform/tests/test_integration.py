# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

import fanstatic
import gocept.httpserverlayer.wsgi
import gocept.jasmine.jasmine
import gocept.jasmine.resource
import gocept.jsform.resource
import gocept.selenium.static


library = fanstatic.Library('gocept.jsform.tests', 'resources')
integration_test = fanstatic.Resource(
    library, 'integration.js', depends=[gocept.jasmine.resource.jasmine])


class JSFormApp(gocept.jasmine.jasmine.TestApp):

    def need_resources(self):
        gocept.jsform.resource.jsform.need()
        integration_test.need()

    @property
    def body(self):
        return '<div id="my_form"></div>'


class JSFormTestCase(gocept.jasmine.jasmine.TestCase):

    layer = gocept.jasmine.jasmine.get_layer(JSFormApp())

    def test_integration(self):
        self.run_jasmine()
