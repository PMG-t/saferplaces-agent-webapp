from . import webapp

app = webapp.create_app()

if __name__ == '__main__':
    app.run(debug=True)
