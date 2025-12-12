import React, { useState, useEffect } from 'react';
import { db } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Service, Barber, Appointment } from '../types';
import { Calendar, Clock, CheckCircle, AlertCircle, X, DollarSign, Star, Gift } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'services' | 'history'>('services');

  // Data State
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);

  // Booking Flow State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [s, b, a] = await Promise.all([
        db.getServices(),
        db.getBarbers(),
        db.getAppointments()
      ]);
      setServices(s);
      setBarbers(b);
      // Filter for current user and sort by date desc
      setMyAppointments(
        a.filter(app => app.userId === user?.id)
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
      );
    };
    fetchData();
  }, [user]);

  // Handle Date Change & Slot Loading
  useEffect(() => {
    if (selectedService && selectedBarber && selectedDate) {
      setLoadingSlots(true);
      setAvailableSlots([]);
      db.getAvailableSlots(selectedDate, selectedBarber.id, selectedService.durationMinutes)
        .then(slots => {
          setAvailableSlots(slots);
          setLoadingSlots(false);
        });
    }
  }, [selectedService, selectedBarber, selectedDate]);

  const handleBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !user) return;

    setBookingLoading(true);
    setFeedback(null);
    try {
      const isoDate = `${selectedDate}T${selectedTime}:00`;
      const newApp = await db.createAppointment({
        userId: user.id,
        userName: user.name,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        date: isoDate
      });

      setMyAppointments(prev => [newApp, ...prev]);
      setFeedback({ type: 'success', msg: 'Agendamento confirmado com sucesso!' });

      // Reset form partially
      setSelectedService(null);
      setSelectedBarber(null);
      setSelectedDate('');
      setSelectedTime('');
      setAvailableSlots([]);
      setView('history');
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setBookingLoading(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    if (window.confirm('Tem certeza que deseja cancelar?')) {
      await db.cancelAppointment(id);
      setMyAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    }
  }

  return (
    <div className="space-y-8">
      {/* Loyalty Card */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-900 border border-brand-500/30 p-6 rounded-lg shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Gift size={100} className="text-brand-500" />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Gift className="text-brand-500" /> Programa Fidelidade
          </h3>
          <p className="text-gray-300 mb-4 max-w-lg">
            A cada 10 cortes realizados (concluídos), você ganha 1 corte de cortesia! Continue agendando conosco.
          </p>

          {(() => {
            const completedCount = myAppointments.filter(a => a.status === 'completed').length;
            const progress = completedCount % 10;
            const rewards = Math.floor(completedCount / 10);

            return (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full max-w-md">
                  <div className="flex justify-between mb-2 text-sm font-bold">
                    <span className="text-brand-500">{progress} cortes</span>
                    <span className="text-gray-400">Meta: 10</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4 border border-gray-600">
                    <div
                      className="bg-gradient-to-r from-brand-500 to-yellow-300 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progress * 10}%` }}
                    ></div>
                  </div>
                </div>

                {rewards > 0 && (
                  <div className="bg-brand-500 text-brand-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-bounce shadow-lg">
                    <Gift size={20} />
                    <span>{rewards} Cortesia(s) Disponível!</span>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Header Tabs */}
      <div className="flex space-x-4 border-b border-gray-700 pb-2">
        <button
          onClick={() => setView('services')}
          className={`pb-2 px-1 font-medium ${view === 'services' ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-400 hover:text-white'}`}
        >
          Novo Agendamento
        </button>
        <button
          onClick={() => setView('history')}
          className={`pb-2 px-1 font-medium ${view === 'history' ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-400 hover:text-white'}`}
        >
          Meus Agendamentos
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-md flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {feedback.msg}
        </div>
      )}

      {view === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* STEP 1: Services */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-brand-800 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-brand-500">1</span>
              Escolha o Serviço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`cursor-pointer p-4 rounded-lg border transition-all flex items-center gap-4 ${selectedService?.id === service.id
                      ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500'
                      : 'bg-brand-800 border-transparent hover:bg-brand-800/80'
                    }`}
                >
                  <img src={service.image} alt={service.name} className="w-16 h-16 rounded-md object-cover" />
                  <div>
                    <h4 className="font-bold text-white">{service.name}</h4>
                    <p className="text-gray-400 text-sm">{service.durationMinutes} min</p>
                    <p className="text-brand-500 font-bold mt-1">R$ {service.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* STEP 2: Barbers (Only if Service selected) */}
            {selectedService && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="bg-brand-800 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-brand-500">2</span>
                  Escolha o Profissional
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {barbers.map(barber => (
                    <div
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber)}
                      className={`cursor-pointer p-4 rounded-lg border transition-all text-center flex flex-col items-center ${selectedBarber?.id === barber.id
                          ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500'
                          : 'bg-brand-800 border-transparent hover:bg-brand-800/80'
                        }`}
                    >
                      <img src={barber.avatarUrl} alt={barber.name} className="w-20 h-20 rounded-full mb-3 border-2 border-brand-900 object-cover" />
                      <h4 className="font-medium text-white">{barber.name}</h4>
                      {/* Rating Stars */}
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={`${(barber.rating || 0) >= star ? 'text-brand-500 fill-brand-500' : 'text-gray-600'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{(barber.rating || 0).toFixed(1)} / 5.0</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Time & Confirm (Sidebar) */}
          <div className="lg:col-span-1">
            <div className="bg-brand-800 p-6 rounded-lg sticky top-6 border border-white/5">
              <h3 className="text-xl font-bold text-white mb-4">Agendamento</h3>

              {!selectedService || !selectedBarber ? (
                <p className="text-gray-500 text-sm">Selecione um serviço e um barbeiro para continuar.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTime('');
                      }}
                      className="w-full bg-brand-900 border border-gray-700 rounded p-2 text-white"
                    />
                  </div>

                  {loadingSlots && <div className="text-brand-500 text-sm animate-pulse">Buscando horários...</div>}

                  {!loadingSlots && selectedDate && availableSlots.length === 0 && (
                    <div className="text-red-400 text-sm">Sem horários para esta data.</div>
                  )}

                  {!loadingSlots && availableSlots.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-400">Horário Disponível</label>
                        <span className="text-[10px] text-brand-500 border border-brand-500/50 px-1 rounded">09:00 - 21:00</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {availableSlots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`text-sm py-1 px-2 rounded ${selectedTime === slot ? 'bg-brand-500 text-brand-900 font-bold' : 'bg-brand-900 text-gray-300 hover:bg-gray-700'}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-4 mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Serviço:</span>
                      <span className="text-white">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Barbeiro:</span>
                      <span className="text-white">{selectedBarber.name}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-brand-500 pt-2">
                      <span>Total:</span>
                      <span>R$ {selectedService.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    disabled={!selectedTime || bookingLoading}
                    onClick={handleBooking}
                    className="w-full mt-4 bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mb-6">Histórico</h3>
          {myAppointments.length === 0 ? (
            <p className="text-gray-500">Nenhum agendamento encontrado.</p>
          ) : (
            myAppointments.map(app => {
              const service = services.find(s => s.id === app.serviceId);
              const barber = barbers.find(b => b.id === app.barberId);
              return (
                <div key={app.id} className="bg-brand-800 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-brand-500 shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="bg-brand-900 p-3 rounded text-brand-500">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-white">{service?.name || 'Serviço'}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${app.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            app.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-700 text-gray-300'
                          }`}>
                          {app.status === 'confirmed' ? 'Confirmado' : app.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Profissional: <span className="text-gray-200">{barber?.name}</span>
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(app.date).toLocaleDateString()} às {new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-1 text-brand-400">
                          <DollarSign size={14} />
                          R$ {app.priceAtBooking.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {app.status === 'confirmed' && (
                    <button
                      onClick={() => cancelAppointment(app.id)}
                      className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};