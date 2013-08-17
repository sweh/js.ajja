# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

import gocept.httpserverlayer.wsgi
import gocept.jsform.resource
import gocept.selenium.static
import gocept.jasmine.jasmine


class JSFormApp(gocept.jasmine.jasmine.TestApp):

    def need_resources(self):
        gocept.jsform.resource.jsform.need()
        gocept.jsform.tests.integration_test.need()

    @property
    def body(self):
        return '<div id="my_form"></div>'


class JSFormTestCase(gocept.jasmine.jasmine.TestCase):

    layer = gocept.jasmine.jasmine.get_layer(JSFormApp())

    def test_integration(self):
        self.run_jasmine()
