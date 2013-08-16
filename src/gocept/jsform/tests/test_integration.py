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


WSGI_LAYER = gocept.jasmine.jasmine.Layer(
    application=JSFormApp(), name='JasmineLayer')

HTTP_SERVER_LAYER = gocept.httpserverlayer.wsgi.Layer(
    name='HTTPServerLayer', bases=(WSGI_LAYER,))

WEBDRIVER_LAYER = gocept.selenium.webdriver.Layer(
    name='WebdriverLayer', bases=(HTTP_SERVER_LAYER,))

SELENESE_LAYER = gocept.selenium.webdriver.WebdriverSeleneseLayer(
    name='SeleneseLayer', bases=(WEBDRIVER_LAYER,))


class JSFormTestCase(gocept.jasmine.jasmine.TestCase):

    layer = SELENESE_LAYER

    def test_integration(self):
        self.run_jasmine()
