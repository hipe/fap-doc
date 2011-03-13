#!/usr/bin/env ruby
require File.dirname(__FILE__)+'/vendor/interface-reflector/rake-like'
# puts "\e[5;35mruby-debug\e[0m"; require 'rubygems'; require 'ruby-debug'


#
# This file is part of the fap-doc distribution.  Its purpose is to help
# install experimental-and/or-required dependencies of fap-doc.
# It is written in ruby and not javascript only because its underlying
# ruby implementation is hot off the presses and has everything we need
# to install this stuff.  Maybe one day for aesthetics and conveninience
# it will be migratated to javascript.
#
# Sorry for any invconvenince or cognitive dissonance this may cause ;)
#



task :check do |o|
  o.desc "Renders an attractive and popular report",
           "to show what is and isn't installed."
  o.execute do
    ::LibrariesTableRenderer.render(self.parent.subcommands, @c.out)
  end
end



task :petrify do |o|
  o.task_class GitTask
  o.category 'doc generation'
  o.desc 'Put {src} in {dest_dirname_basename}/',
            "You will need caolan's petrify, but you may not need it here."
  o.src 'git://github.com/hipe/petrify.git'
  o.set :old_src, 'git://github.com/caolan/petrify.git'
  o.dest "#{File.dirname(__FILE__)}/vendor/petrify"
  o.note "be mindful of the branches!",
    "i branched this once upon a time to patch a thing.",
    "you should look and see what's going on there now (at {old_src})."
end



task :docco do |o|
  o.task_class GitTask
  o.category 'doc generation'
  o.deactivate!
  o.desc 'Put {src} in {dest_dirname_basename}/',
           "I hate this and i don't like it, prolly not gonnna use it."
  o.src 'git://github.com/jashkenas/docco.git'
  o.dest "#{File.dirname(__FILE__)}/vendor/docco"
end

task :"syntax-highlighter" do |o|
  o.task_class WgetTask
  o.category 'syntax highlighting'
  o.desc 'put Alex Gorbatchev\'s famous whoodily hah in {dest}/'
  o.host 'alexgorbatchev.com'
  o.url '/SyntaxHighlighter/download/download.php?sh_current'
  o.dest "#{File.dirname(__FILE__)}/vendor/syntaxhighlighter_current.zip"
    # it would be nice to etc but we can't because etc
  o.note "now try: cd {dest_dirname_basename}; uzip {dest_basename}"
  o.interface { |i| i.on '-n', '--dry-run', 'dry run' }
end

task :"syntax-highligher-from-hg" do |o|
  o.task_class HgTask
  o.category 'syntax highlighting'
  o.desc 'get the source straight from hg (for the demos)'
  o.src 'https://bitbucket.org/alexg/syntaxhighlighter'
  o.dest "#{File.dirname(__FILE__)}/vendor/syntaxhighlighter_src"
end


#
# @todo the below is all support code for this file.  It is all the
# implement logic for the above tasks.  It was copy pasted with occasional
# modifications from irclogs.
# We are torn as to whether or not we want to put them into a library.
# Sometimes it is nice to just see the code here, see what it's doing and make
# ad-hoc changes to it.
#

module FapUnit
  class TaskCommon < Hipe::InterfaceReflector::TaskDefinition
    attr_akksessor :category, :dest, :note
    class << self
      def deactivate!
        @active = false;
      end
      def active?
        instance_variable_defined?('@active') ? @active : true
      end
    end
    def dest_dir
      dest.sub(/\.tar\.gz$/,'')
    end
    def dest_dirname_basename
      File.basename(File.dirname(dest))
    end
    def show_note
      note and @c.err.puts(color("note: ",:yellow) <<
        [note].flatten.join("\n"))
      true
    end
  end

  class GitTask < TaskCommon
    attr_akksessor :src
    def execute
      @c.err.puts %x{git clone #{src} #{dest}}
      show_note
    end
  end

  class HgTask < TaskCommon
    attr_akksessor :src
    def execute
      cmd = "hg clone #{src} #{dest}"
      @c.out.puts color("running with exec!: ", :yellow) << cmd
      show_note
      exec cmd
    end
  end

  class WgetTask < TaskCommon
    attr_akksessor :host, :url, :port
    def execute
      these = [host, url, dest]
      these.index(nil).nil? and return wget(*these)
      fail("I CAINT")
    end
    def wget host, url, dest
      require 'net/http'
      File.exist?(dest) and return @c.err.puts("exists: #{dest}")
      @c.err.print "getting http://#{host}#{port}#{url}\n"
      len = 0;
      if ! @c.key?(:dry_run) || ! @c[:dry_run]
        File.open(dest, 'w') do |fh|
          res = Net::HTTP.start(host) do |http|
            http.get(url) do |str|
              @c.err.print '.'
              len += str.size
              fh.write str
            end
          end
        end
      end
      @c.err.puts "\nwrote #{dest} (#{len} bytes)."
      note and @c.err.puts(color("note: ",:yellow) <<
        [note].flatten.join("\n"))
      true
    end
    def dest_dirname_basename;          File.basename(File.dirname(dest)) end
    def dest_basename;                                File.basename(dest) end
    def url_basename;                                  File.basename(url) end
  end

  module LibrariesTableRenderer
    extend Hipe::InterfaceReflector::Colorizer
    extend self
    def render cmds, out
      require File.dirname(__FILE__)+'/vendor/interface-reflector/omni-table'
      cat_list = []
      cats = Hash.new { |h, k| cat_list.push(k); h[k] = [] }
      cmds.select{ |c| c.respond_to?(:category) }.each do |c|
        cats[c.category].push(c)
      end
      # cats.values.each { |ls| ls.sort! { |a,b| a.name <=> b.name } }
      tbl = []
      cat_list.each do |cat|
        tbl.empty? or tbl.push(['','','']).push(['','',''])
        tbl.push [
          { :value => " * #{color(cat, :bright, :green)} * ",
            :align => :left  }, '', '' ]
        cats[cat].each do |c|
          di = c.subcommand_documenting_instance
          status_msg = if (:not_applicable == di.dest)
                               color('n/a', :green)
          elsif File.exists?(di.dest_dir)
            if c.active? then  color('installed:',     :green)
            else               color('mehnstalled:',   :yellow) end
          elsif c.active? then color('not installed:', :dark_red)
          else                 color('meh:',           :yellow) end
          status_str = if (:not_applicable == di.dest)
                               '(n/a)'
          else                 di.dest_dir end
          tbl.push([ c.name, status_msg, status_str])
        end
      end
      ::Hipe::InterfaceReflector::OmniTable.new(tbl,
        [{:align => :right},{:align => :right},{:align => :left}]).
        sep(' ').no_headers!.to_ascii(out)
    end
  end
end
include FapUnit
