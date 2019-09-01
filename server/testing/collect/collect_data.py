import tornado.escape
import tornado.ioloop
from tornado.options import define, options
import tornado.web
import os
import json
import matplotlib.pyplot as plt

PORT = 8000
i = 0
define("port", default=PORT, help="run on the given port", type=int)


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        # main page load
        self.render("index.html", messages=None)


class AjaxHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        # get unlikely to be used for ajax
        self.write("Not allowed")
        self.finish()

    def post(self, *args):
        strokes = tornado.escape.json_decode(self.request.body)
        global i
        directory = os.path.join('../dataset', 'set'+str(i))
        if os.path.exists(directory):
            raise Exception("Make sure that the 'set' directories are unique.")
        else:
            os.mkdir(directory)
        i += 1
        with open(os.path.join(directory, 'strokes.json'), 'w') as fo:
            fo.write(str(strokes))
        X = [pair[0] for stroke in strokes for pair in stroke]
        Y = [pair[1] for stroke in strokes for pair in stroke]
        plt.xlim(0, 700)
        plt.ylim(500, 0)
        plt.scatter(X, Y, s=3)
        plt.savefig(os.path.join(directory, 'picture.png'))
        plt.close()
        self.finish()


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/libraries/(.*)", tornado.web.StaticFileHandler,
             {"path": os.path.join(os.path.dirname(__file__), "libraries")}),
            (r"/(ajax)$", AjaxHandler),
        ]
        settings = dict(
            debug=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)


def main():
    # start server
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    print("Running on port:", options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
