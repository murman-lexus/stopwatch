require File.expand_path('../../test_helper', __FILE__)

class TimerTest < ActiveSupport::TestCase
  fixtures :users, :user_preferences, :time_entries

  setup do
    @user = User.find 1
    @timer = Stopwatch::Timer.new @user
    @data = @timer.send :data
    @time_entry = TimeEntry.last
  end

  test "should know wether its running" do
    refute @timer.running?
    @data[:started_at] = 5.minutes.ago
    assert @timer.running?
  end

  test "should start timer" do
    assert_nil @data[:started_at]
    @timer.start @time_entry
    assert @data[:started_at].present?
    assert_equal @time_entry.id, @data[:time_entry_id]
  end

  test "should stop timer and update time entry" do
    hours = @time_entry.hours
    @timer.start @time_entry
    @data[:started_at] = 1.hour.ago.to_i
    @timer.stop

    @time_entry.reload
    assert_equal hours + 1, @time_entry.hours
  end

  test "should update time entry" do
    hours = @time_entry.hours
    @timer.start @time_entry
    @data[:started_at] = 1.hour.ago.to_i
    @timer.update

    @time_entry.reload
    assert_equal hours + 1, @time_entry.hours
   end

  test "session duration remains separate from previously recorded hours across updates" do
    @time_entry.update_column(:hours, 10.0)
    @timer.start @time_entry
    @data[:started_at] = 30.minutes.ago.to_i
    @data[:session_started_at] = @data[:started_at]
    @timer.update

    restored = Stopwatch::Timer.new User.find(@user.id)
    payload = JSON.parse(restored.to_json)
    assert_equal restored.send(:data)[:session_started_at], @data[:session_started_at]
    assert_operator @time_entry.reload.hours, :>=, 10.49
    assert_equal Stopwatch::Timer::HourFormatter.new(0.5).format_hours, payload['session_time_spent']
    restored.stop
    assert_nil restored.send(:data)[:session_started_at]
  end

  test "should save and restore" do
    hours = @time_entry.hours
    @timer.start @time_entry
    @data[:started_at] = 1.hour.ago.to_i
    @timer.save

    timer = Stopwatch::Timer.new User.find(@user.id)
    assert timer.running?
    timer.stop

    @time_entry.reload
    assert_equal hours + 1, @time_entry.hours
  end


end

