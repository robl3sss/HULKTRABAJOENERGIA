"""Servidor local del laboratorio. Python 3, biblioteca estándar, sin instalaciones."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import webbrowser
import socket

root = Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.fbx': 'application/octet-stream'}
    def log_message(self, *args):
        pass

server = None
for port in range(8765, 8786):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(root)))
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('No hay un puerto local disponible entre 8765 y 8785.')
url = f'http://127.0.0.1:{server.server_port}/'
print(f'HULK TRABAJO Y ENERGÍA: {url}\nMantén esta ventana abierta. Ctrl+C para cerrar.')
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nLaboratorio cerrado.')
finally:
    server.server_close()
