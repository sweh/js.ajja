# -*- coding: utf-8 -*-
import fanstatic
import gocept.jasmine.jasmine
import gocept.jasmine.resource
import gocept.jsform.resource
import os


library = fanstatic.Library('gocept.jsform.tests', 'resources')
jsform_test = fanstatic.Resource(
    library, 'integration.js', depends=[
        gocept.jasmine.resource.jasmine,
        gocept.jsform.resource.jsform,
    ])
listwidget_test = fanstatic.Resource(
    library, 'listwidget.js', depends=[
        gocept.jasmine.resource.jasmine,
        gocept.jsform.resource.list_widget,
    ])


# Register this library programmatically to avoid making the package metadata
# depend on test-only dependencies.
fanstatic.get_library_registry().add(library)


class JSFormApp(gocept.jasmine.jasmine.TestApp):

    def need_resources(self):
        jsform_test.need()

    @property
    def body(self):
        return '<div id="my_form"></div>'


class JSFormTestCase(gocept.jasmine.jasmine.TestCase):

    layer = gocept.jasmine.jasmine.get_layer(JSFormApp())
    debug = os.environ.get('JASMINE_DEBUG', False)

    def test_integration(self):
        self.run_jasmine()


class ListWidgetApp(JSFormApp):

    def need_resources(self):
        listwidget_test.need()


class ListWidgetTestCase(JSFormTestCase):

    layer = gocept.jasmine.jasmine.get_layer(ListWidgetApp())
