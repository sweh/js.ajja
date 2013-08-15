# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

import gocept.selenium.static
import os.path
import shutil


class StaticFilesLayer(gocept.selenium.static.StaticFilesLayer):

    def testSetUp(self):
        super(StaticFilesLayer, self).testSetUp()
        # Move our fixtures into the `documentroot`.
        fixtures_root = os.path.join(os.path.dirname(__file__), 'files')
        shutil.rmtree(self['documentroot'])  # `copytree` creates it
        shutil.copytree(fixtures_root, self['documentroot'], symlinks=True)


STATIC_FILES_LAYER = StaticFilesLayer()


class SeleniumTestCase(gocept.selenium.static.TestCase):

    layer = STATIC_FILES_LAYER

    def test_open_static_file_in_browser(self):
        sel = self.selenium
        sel.open('testpage.html')
        sel.waitForTextPresent('Testpage')
