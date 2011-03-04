#!/usr/bin/env ruby
require File.dirname(__FILE__)+'/vendor/interface-reflector/rake-like'
# puts "\e[5;35mruby-debug\e[0m"; require 'rubygems'; require 'ruby-debug'

task :petrify do |o|
  o.task_class GitTask
  o.desc 'put {src} in {dest_dirname_basename}/'
  o.src 'git://github.com/hipe/petrify.git'
  o.set :old_src, 'git://github.com/caolan/petrify.git'
  o.dest "#{File.dirname(__FILE__)}/vendor/petrify-hipe"
  o.note "be mindful of the branches!",
    "i branched this once upon a time to patch a thing.",
    "you should look and see what's going on there now (at {old_src})."
end

task :docco do |o|
  o.task_class GitTask
  o.desc 'put {src} in {dest_dirname_basename}/'
  o.src 'git://github.com/jashkenas/docco.git'
  o.dest "#{File.dirname(__FILE__)}/vendor/docco"
end

module FapUnit
  class GitTask < Hipe::InterfaceReflector::TaskDefinition
    attr_akksessor :src, :dest, :note
    def execute
      @c.err.puts %x{git clone #{src} #{dest}}
      note and @c.err.puts(color("note: ",:yellow) <<
        [note].flatten.join("\n"))
      true
    end
    def dest_dirname_basename
      File.basename(File.dirname(dest))
    end
  end
end
include FapUnit
