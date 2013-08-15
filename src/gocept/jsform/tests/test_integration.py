# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

from fanstatic import Fanstatic
import gocept.httpserverlayer.wsgi
import gocept.jsform.resource
import gocept.selenium.static
import os.path
import plone.testing
import unittest
import gocept.jsform.tests.resource


def app(environ, start_response):
    start_response('200 OK', [])
    gocept.jsform.resource.jsform.need()
    gocept.jsform.tests.resource.integration.need()
    with open(os.path.join(
            os.path.dirname(__file__), 'test_integration.html')) as f:
        return [f.read()]


class WSGILayer(plone.testing.Layer):
    """WSGILayer - requires an ApplicationLayer as base layer."""

    def setUp(self):
        fanstatic_app = Fanstatic(app)
        self['wsgi_app'] = fanstatic_app

    def tearDown(self):
        del self['wsgi_app']

WSGI_LAYER = WSGILayer(name='WSGILayer')

HTTP_SERVER_LAYER = gocept.httpserverlayer.wsgi.Layer(
    name='HTTPServerLayer', bases=(WSGI_LAYER,))

WEBDRIVER_LAYER = gocept.selenium.webdriver.Layer(
    name='WebdriverLayer', bases=(HTTP_SERVER_LAYER,))

SELENESE_LAYER = gocept.selenium.webdriver.WebdriverSeleneseLayer(
    name='SeleneseLayer', bases=(WEBDRIVER_LAYER,))


class SeleniumTestCase(unittest.TestCase,
                       gocept.selenium.webdriver.WebdriverSeleneseTestCase):

    layer = SELENESE_LAYER

    def test_integration(self):
        sel = self.selenium
        sel.open('/')
        sel.waitForElementPresent('css=.passingAlert, .failingAlert')
        summary = sel.getText('css=.bar')
        if 'Failing' in summary:
            # XXX: Get all failing test messages (use webdriver)
            message = sel.getText('css=.messages')
            self.fail('{}\n{}'.format(summary, message))
