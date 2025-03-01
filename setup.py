# This should be only one line. If it must be multi-line, indent the second
# line onwards to keep the PKG-INFO file format intact.
"""Next generation forms in javascript"""

from setuptools import setup, find_packages
import glob
import os.path
import json
import sys


def read(path):
    if sys.version_info < (3,):
        f = open(path)
    else:
        f = open(path, encoding='UTF-8')
    text = f.read()
    f.close()
    return text


def project_path(*names):
    return os.path.join(os.path.dirname(__file__), *names)


version = json.loads(read(project_path(
    'src', 'ajja', 'resources', 'bower.json')))['version']


setup(
    name='ajja',
    version=version,

    install_requires=[
        'cssmin',
        'fanstatic>=1.0a2',
        'js.classy',
        'js.jquery',
        'js.knockout>=3.1.0',
        'setuptools',
    ],

    extras_require={
        'test': [
            'gocept.jasmine>=0.3',
            'gocept.jslint',
            'gocept.testing',
        ],
        'listwidget': [
            'js.bootstrap',
            'js.jqueryui',
        ],
    },

    entry_points={
        'console_scripts': [
            # 'binary-name = ajja.module:function'
        ],
        'fanstatic.libraries': [
            'ajja = ajja.resource:library',
        ],
    },

    author=('Sebastian Wehrmann <sw@gocept.com>, '
            'Maik Derstappen <md@derico.de>'),
    author_email='sw@gocept.com',
    license='MIT',
    url='https://github.com/gocept/ajja',

    keywords='form javascript jquery client',
    classifiers="""\
License :: OSI Approved :: MIT License
Programming Language :: Python
Programming Language :: Python :: 2
Programming Language :: Python :: 2.6
Programming Language :: Python :: 2.7
Programming Language :: Python :: 2 :: Only
"""[:-1].split('\n'),
    description=__doc__.strip(),
    long_description='\n\n'.join(open(project_path(name)).read() for name in (
        'README.txt',
        'CHANGES.txt',
    )),

    packages=find_packages('src'),
    package_dir={'': 'src'},
    include_package_data=True,
    data_files=[('', glob.glob(project_path('*.txt')))],
    zip_safe=False,
)
