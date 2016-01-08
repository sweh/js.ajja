# -*- coding: utf-8 -*-
import unittest


class IntegrationTests(unittest.TestCase):

    def test_resources_are_all_available(self):
        from gocept.jsform import jsform
        jsform.need()
