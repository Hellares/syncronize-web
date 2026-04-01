import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Syncronize',
  description: 'Política de privacidad de Syncronize SAC. Conoce cómo recopilamos, usamos y protegemos tu información.',
};

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004A94] to-[#437EFF] py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-white/70 text-sm hover:text-white transition-colors">
            &larr; Volver al inicio
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
            Política de Privacidad
          </h1>
          <p className="mt-2 text-white/70">Última actualización: 31 de marzo de 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 space-y-8 text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Información General</h2>
            <p>
              <strong>Syncronize SAC</strong> (en adelante &ldquo;Syncronize&rdquo;), con domicilio en Perú,
              es responsable del tratamiento de los datos personales que recopilamos a través de nuestra
              plataforma web, aplicación móvil y servicios relacionados disponibles en{' '}
              <strong>syncronize.net.pe</strong>.
            </p>
            <p className="mt-2">
              Para cualquier consulta sobre privacidad, puede contactarnos en:{' '}
              <a href="mailto:soporte@syncronize.net.pe" className="text-[#437EFF] hover:underline">
                soporte@syncronize.net.pe
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Datos que Recopilamos</h2>
            <p>Recopilamos los siguientes tipos de información:</p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>
                <strong>Datos de registro:</strong> nombre, correo electrónico, número de teléfono, RUC o
                documento de identidad, nombre de la empresa.
              </li>
              <li>
                <strong>Datos de uso:</strong> información sobre cómo utiliza nuestros servicios, páginas
                visitadas, funciones utilizadas y frecuencia de uso.
              </li>
              <li>
                <strong>Datos del negocio:</strong> productos, servicios, inventario, transacciones de venta,
                información de clientes y proveedores que usted registre en la plataforma.
              </li>
              <li>
                <strong>Datos de pago:</strong> método de pago seleccionado y comprobantes de pago de
                suscripción. No almacenamos datos de tarjetas de crédito/débito directamente.
              </li>
              <li>
                <strong>Datos del dispositivo:</strong> tipo de dispositivo, sistema operativo, identificadores
                únicos y tokens de notificación push.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Uso de la Información</h2>
            <p>Utilizamos su información para:</p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>Proveer, mantener y mejorar nuestros servicios.</li>
              <li>Gestionar su cuenta y suscripción.</li>
              <li>Procesar transacciones y enviar notificaciones relacionadas.</li>
              <li>Generar su tienda online y mostrar sus productos en el marketplace.</li>
              <li>Enviar notificaciones push sobre pedidos, actualizaciones del sistema y comunicaciones
                importantes.</li>
              <li>Brindar soporte técnico y atención al cliente.</li>
              <li>Cumplir con obligaciones legales y fiscales aplicables.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Propiedad de los Datos</h2>
            <p>
              <strong>Syncronize no es propietario de los datos que usted registra en la plataforma.</strong>{' '}
              Toda la información que usted o sus usuarios ingresen (productos, clientes, ventas, documentos,
              información fiscal, etc.) es de su exclusiva propiedad y responsabilidad.
            </p>
            <p className="mt-2">
              Syncronize actúa únicamente como un prestador de servicios tecnológicos que facilita el
              almacenamiento y procesamiento de dicha información.{' '}
              <strong>No nos hacemos responsables por la veracidad, exactitud, legalidad o integridad
              de los datos ingresados por los usuarios.</strong>
            </p>
            <p className="mt-2">
              El usuario es el único responsable del contenido que registra, publica o comparte a través
              de la plataforma, incluyendo la información que se muestra en su tienda online y marketplace.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Almacenamiento y Seguridad</h2>

            <p>
              Sus datos se almacenan en servidores seguros. Implementamos medidas de seguridad técnicas
              y organizativas para proteger su información, incluyendo:
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>Cifrado de contraseñas mediante algoritmos seguros (bcrypt).</li>
              <li>Autenticación mediante tokens JWT con expiración controlada.</li>
              <li>Separación lógica de datos entre empresas (arquitectura multi-tenant).</li>
              <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
              <li>Almacenamiento seguro de archivos multimedia en servidores dedicados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Compartición de Datos</h2>
            <p>
              <strong>No vendemos</strong> su información personal a terceros. Podemos compartir datos
              únicamente en los siguientes casos:
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li>
                <strong>SUNAT:</strong> para la emisión de comprobantes electrónicos (facturas, boletas)
                según la legislación peruana vigente.
              </li>
              <li>
                <strong>Marketplace público:</strong> los productos y datos de contacto de su negocio que
                usted elija publicar en su tienda online serán visibles públicamente.
              </li>
              <li>
                <strong>Obligación legal:</strong> cuando sea requerido por ley, orden judicial o
                autoridad competente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Derechos del Usuario</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="mt-3 space-y-2 list-disc pl-6">
              <li><strong>Acceso:</strong> solicitar una copia de sus datos personales.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de sus datos personales.</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos para fines específicos.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, envíe un correo a{' '}
              <a href="mailto:soporte@syncronize.net.pe" className="text-[#437EFF] hover:underline">
                soporte@syncronize.net.pe
              </a>{' '}
              con el asunto &ldquo;Derechos de Privacidad&rdquo;.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Retención de Datos</h2>
            <p>
              Conservamos sus datos mientras su cuenta esté activa o sea necesario para proporcionarle
              nuestros servicios. Los datos fiscales y de facturación se conservan según los plazos
              establecidos por la legislación tributaria peruana. Si solicita la eliminación de su
              cuenta, eliminaremos sus datos en un plazo de 30 días, excepto aquellos que debamos
              conservar por obligación legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Notificaciones Push</h2>
            <p>
              Nuestra aplicación móvil utiliza notificaciones push para informarle sobre pedidos,
              actualizaciones del sistema y comunicaciones relevantes. Puede desactivar las
              notificaciones push en cualquier momento desde la configuración de su dispositivo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Cambios en esta Política</h2>
            <p>
              Nos reservamos el derecho de actualizar esta política de privacidad. Notificaremos
              cualquier cambio significativo a través de la plataforma o por correo electrónico.
              Le recomendamos revisar esta página periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contacto</h2>
            <p>
              Si tiene preguntas sobre esta política de privacidad, contáctenos:
            </p>
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
