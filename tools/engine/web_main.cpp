// Browser entry point for NSCE (Optiline): one UCI line per call, output via stdout.
#include "nsce/uci.hpp"
#include <emscripten/emscripten.h>
#include <iostream>
#include <string>

static nsce::Uci* g_uci = nullptr;

extern "C" EMSCRIPTEN_KEEPALIVE void nsce_command(const char* line) {
  if (!g_uci) g_uci = new nsce::Uci();
  std::string s(line);
  if (!s.empty() && s.back() == '\r') s.pop_back();
  if (!s.empty()) g_uci->command(s);
}

int main() {
  std::ios::sync_with_stdio(false);
  std::cout.setf(std::ios::unitbuf);
  g_uci = new nsce::Uci();
  return 0;
}
