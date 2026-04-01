import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Syncronize',
  description: 'Términos y condiciones de uso de la plataforma Syncronize SAC.',
};

export default function Terminos() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004A94] to-[#437EFF] py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-white/70 text-sm hover:text-white transition-colors">
            &larr; Volver al inicio
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
            Términos y Condiciones
          </h1>
          <p className="mt-2 text-white/70">Última actualización: 31 de marzo de 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 space-y-8 text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar la plataforma <strong>Syncronize</strong> (sitio web, aplicación
              móvil y servicios relacionados) operada por <strong>Syncronize SAC</strong>, usted acepta
              estos términos y condiciones en su totalidad. Si no está de acuerdo con alguno de estos
              términos, le solicitamos que no utilice nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Descripción del Servicio</h2>
            <p>
              Syncronize es una plataforma SaaS (Software como Servicio) que ofrece herramientas de
              gestión empresarial, incluyendo:
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>Punto de Venta (POS) y gestión de caja.</li>
              <li>Inventario, kardex y control de stock multi-sede.</li>
              <li>Gestión de compras y proveedores.</li>
              <li>Gestión de cuentas por cobrar y pagar.</li>
              <li>Recursos humanos y cálculo de planilla.</li>
              <li>Tienda online / página web del negocio.</li>
              <li>Marketplace de productos y servicios.</li>
              <li>Reportes y dashboards.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Registro y Cuenta</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                Para usar Syncronize debe crear una cuenta proporcionando información veraz y completa.
              </li>
              <li>
                Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.
              </li>
              <li>
                Cada empresa registrada es un espacio independiente. El administrador de la empresa es
                responsable de los usuarios y permisos que asigne.
              </li>
              <li>
                Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Planes y Suscripciones</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <strong>Plan Básico (Gratuito):</strong> incluye funcionalidades limitadas y una página
                web temporal por 2 meses. No requiere pago.
              </li>
              <li>
                <strong>Planes de pago</strong> (Emprendedor, Profesional, Empresarial): ofrecen
                funcionalidades ampliadas según el nivel contratado, con opciones de pago mensual,
                semestral y anual.
              </li>
              <li>
                Los precios pueden ser actualizados con previo aviso de 30 días.
              </li>
              <li>
                El pago se realiza mediante transferencia bancaria, Yape, Plin, efectivo o tarjeta.
              </li>
              <li>
                La suscripción vencida genera un período de gracia de 7 días antes de la suspensión
                del servicio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Uso Aceptable</h2>
            <p>El usuario se compromete a:</p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>Utilizar la plataforma únicamente para fines comerciales legítimos.</li>
              <li>No intentar acceder a datos de otras empresas registradas en la plataforma.</li>
              <li>No realizar ingeniería inversa, descompilar o intentar extraer el código fuente.</li>
              <li>No utilizar la plataforma para almacenar o distribuir contenido ilegal.</li>
              <li>No sobrecargar intencionalmente los servidores o infraestructura del servicio.</li>
              <li>Mantener actualizada la información de su empresa y datos fiscales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Propiedad de los Datos y Deslinde de Responsabilidad</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <strong>Syncronize no es propietario ni titular de los datos que usted registra en la
                plataforma.</strong> Toda la información ingresada (productos, clientes, ventas, documentos
                fiscales, información de empleados, etc.) es de exclusiva propiedad y responsabilidad del usuario.
              </li>
              <li>
                <strong>Syncronize no se hace responsable</strong> por la veracidad, exactitud, legalidad,
                integridad o actualización de los datos, contenidos o información ingresada por los usuarios
                o sus colaboradores.
              </li>
              <li>
                El usuario es el único responsable del uso que haga de la plataforma, de los datos que
                registre y de las operaciones comerciales que realice a través del sistema.
              </li>
              <li>
                Syncronize no será responsable por pérdidas, daños o perjuicios que resulten de errores,
                omisiones o inexactitudes en la información registrada por el usuario.
              </li>
              <li>
                Syncronize no utilizará sus datos comerciales para fines distintos a la prestación del
                servicio.
              </li>
              <li>
                Los datos publicados en el marketplace (productos, información de contacto del negocio)
                serán visibles públicamente según la configuración que usted elija. El usuario es responsable
                del contenido que decide hacer público.
              </li>
              <li>
                En caso de cancelación de la cuenta, puede solicitar una exportación de sus datos
                dentro de los 30 días posteriores.
              </li>
            </ul>
          </section>

          {/* Sección de Facturación Electrónica - Se habilitará cuando se implemente
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Facturación Electrónica</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                Syncronize facilita la emisión de comprobantes electrónicos conforme a las normas de
                SUNAT.
              </li>
              <li>
                El usuario es responsable de la veracidad de los datos fiscales ingresados (RUC,
                razón social, dirección fiscal).
              </li>
              <li>
                Syncronize no se responsabiliza por errores en la emisión de comprobantes derivados
                de información incorrecta proporcionada por el usuario.
              </li>
            </ul>
          </section>
          */}

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Disponibilidad del Servicio</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                Nos esforzamos por mantener el servicio disponible las 24 horas del día, los 7 días
                de la semana.
              </li>
              <li>
                Podemos realizar mantenimientos programados, los cuales serán notificados con
                anticipación cuando sea posible.
              </li>
              <li>
                No garantizamos la disponibilidad ininterrumpida del servicio. No seremos responsables
                por interrupciones causadas por factores fuera de nuestro control.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Limitación de Responsabilidad</h2>
            <p>
              Syncronize proporciona el servicio &ldquo;tal cual&rdquo;. En la máxima medida permitida
              por la ley:
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>
                No nos responsabilizamos por pérdidas comerciales, lucro cesante o daños indirectos
                derivados del uso o imposibilidad de uso del servicio.
              </li>
              <li>
                Nuestra responsabilidad máxima se limita al monto pagado por el usuario en los
                últimos 12 meses de suscripción.
              </li>
              <li>
                El usuario es responsable de mantener respaldos propios de su información crítica.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Cancelación</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                El usuario puede cancelar su suscripción en cualquier momento desde la aplicación.
              </li>
              <li>
                No se realizan reembolsos por períodos parciales no utilizados.
              </li>
              <li>
                Syncronize puede cancelar una cuenta por violación de estos términos, con notificación
                previa de 15 días excepto en casos graves.
              </li>
              <li>
                Tras la cancelación, los datos se conservan por 30 días antes de su eliminación
                definitiva.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios
              significativos serán notificados por correo electrónico o a través de la plataforma con
              al menos 15 días de anticipación. El uso continuado del servicio tras la notificación
              constituye la aceptación de los términos modificados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Ley Aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia
              será resuelta ante los tribunales competentes de la ciudad de Lima, Perú.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Contacto</h2>
            <p>Para consultas sobre estos términos:</p>
            <ul className="mt-3 space-y-1">
              <li><strong>Empresa:</strong> Syncronize SAC</li>
              <li><strong>Email:</strong>{' '}
                <a href="mailto:soporte@syncronize.net.pe" className="text-[#437EFF] hover:underline">
                  soporte@syncronize.net.pe
                </a>
              </li>
              <li><strong>WhatsApp:</strong>{' '}
                <a href="https://wa.me/51942857613" className="text-[#437EFF] hover:underline">
                  +51 942 857 613
                </a>
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
