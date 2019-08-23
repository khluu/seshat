from __future__ import print_function
from __future__ import unicode_literals

import tornado.escape
import tornado.ioloop
from tornado.options import define, options
import tornado.web

import os.path
import shlex
import subprocess
import json

PORT = 8000

define("port", default=PORT, help="run on the given port", type=int)

class AjaxHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        """get unlikely to be used for ajax"""
        self.write("Not allowed")
        self.finish()

    def post(self, *args):
        """Examoptionsple handle ajax post"""
        file_name = "input.scgink"
        scg = tornado.escape.json_decode(self.request.body)
        lines = scg.split("\n")
        #print(lines)
        if (os.path.exists(file_name)):
            os.remove(file_name)
        # I have no idea why, but just dumping scg into a file doesn't work
        # Although you can see the correct scg in the file, you cannot read
        # anything from it. Instead, write lines in scg line by line
        with open(file_name, "a", encoding="utf-8") as fo:
            for l in lines:
                fo.write(l+"\n")

        path = "./seshat -c Config/CONFIG -i server/input.scgink"
        args = shlex.split(path)
        p1 = subprocess.Popen(args, stdout=subprocess.PIPE, cwd="../")
        output = p1.communicate()[0].decode()

        # get the parse tree, latex output
        tree = output.split('JSON:\n')[-1]
        latex = output.split('\n\nJSON:\n')[0].split('LaTeX:\n')[-1]

        msg_back = {}
        msg_back['latex'] = latex
        msg_back['tree'] = json.loads(tree)
        #print(msg_back)

        self.write(json.dumps(msg_back))
        self.finish()


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        """main page set up"""
        self.render("index.html", messages=None)


class Application(tornado.web.Application):
    """Simple example App"""
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/(favicon.ico)", tornado.web.StaticFileHandler,
            {"path":""}),
            (r"/js/(.*)", tornado.web.StaticFileHandler,
            {"path":os.path.join(os.path.dirname(__file__), "js")}),
            (r"/(ajax)$", AjaxHandler),
        ]
        settings = dict(
            debug=True,
            #static_path=os.path.join(os.path.dirname(__file__), "js")
        )
        tornado.web.Application.__init__(self, handlers, **settings)

def main():
    """start server"""
    tornado.options.parse_command_line()
    app = Application()
    #app.add_handlers(r"cdnjs\.cloudfare\.com", [
    #    (r"/ajax/libs/mathjax/2.7.5/(.*)", tornado.web.StaticFileHandler,
    #    {"path":""}),
    #])
    app.listen(PORT)
    print("Running on port:", PORT)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()